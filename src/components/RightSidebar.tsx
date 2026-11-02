import React, {useState} from 'react';
import {useQuizStore} from '../store/useQuizStore';
import {DEFAULT_SESSION_STATE} from '../store/defaults';
import {calculateMastery, getActiveQuestions} from '../utils/quizLogic';
import {getAllMediaIds, deleteMedia} from '../utils/mediaStorage';
import {downloadExport, DEFAULT_EXPORT_OPTIONS, toFileSlug, type ExportOptions} from '../utils/exportFiles';
import {MissingMediaError} from '../utils/archiveMedia';
import {plural} from '../utils/plural';
import {ExportOptionsModal} from './ExportOptionsModal';
import {MessageModal, SimpleConfirmModal, TextPromptModal, TypeToConfirmModal} from './AppModals';
import {SidebarTabs, type RightSidebarTab} from './rightSidebar/SidebarTabs';
import {MasteryPanel, type MasteryStats} from './rightSidebar/MasteryPanel';
import {ImportPanel} from './rightSidebar/ImportPanel';
import {SettingsNav, type SettingsSectionId} from './rightSidebar/SettingsNav';
import {PendingMediaImportModal} from './rightSidebar/PendingMediaImportModal';
import {PersonalizationSettingsSection} from './rightSidebar/settings/PersonalizationSettingsSection';
import {BehaviorSettingsSection} from './rightSidebar/settings/BehaviorSettingsSection';
import {DataSettingsSection, type CacheClearResult} from './rightSidebar/settings/DataSettingsSection';
import {LinksSettingsSection} from './rightSidebar/settings/LinksSettingsSection';
import {ProfilesSettingsSection} from './rightSidebar/settings/ProfilesSettingsSection';
import {useImportWorkflow} from './rightSidebar/useImportWorkflow';
import type {Profile} from '../types';
import {flattenProgress, mediaIdsInProfiles} from '../store/quizStoreHelpers';

const CACHE_DELETE_BATCH_SIZE = 25;

const TabPanel: React.FC<{tab: RightSidebarTab; className: string; children: React.ReactNode}> = ({
    tab,
    className,
    children
}) => (
    <div
        id={`right-sidebar-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`right-sidebar-tab-${tab}`}
        className={className}
    >
        {children}
    </div>
);

export const RightSidebar: React.FC = () => {
    const {
        profiles,
        activeProfileId,
        createProfile,
        renameProfile,
        switchProfile,
        deleteProfile,
        importProfile,
        resetAllData,
        importSubjects,
        importSubjectExport,
        resetSubjectProgress,
        settings,
        setConfirmSubjectDelete,
        setConfirmProfileDelete,
        setConfirmResetSubjectProgress,
        setConfirmResetTopicProgress,
        setMode,
        setQuizRequeueOnIncorrect,
        setQuizRequeueOnSkip,
        setQuizRequeueGaps,
        setAnimatedBackground,
        setColorTheme,
        setCustomAccentColor,
        setSoundEnabled
    } = useQuizStore();
    const [activeTab, setActiveTab] = useState<RightSidebarTab>('mastery');
    const [settingsSection, setSettingsSection] = useState<SettingsSectionId>('profiles');
    const [deleteProfileConfirm, setDeleteProfileConfirm] = useState<{id: string; name: string} | null>(null);
    const [lastProfileDeleteId, setLastProfileDeleteId] = useState<string | null>(null);
    const [factoryResetConfirm, setFactoryResetConfirm] = useState(false);
    const [newProfileModalOpen, setNewProfileModalOpen] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const [cacheClearResult, setCacheClearResult] = useState<CacheClearResult | null>(null);
    const [resetSubjectDataConfirm, setResetSubjectDataConfirm] = useState<{id: string; name: string} | null>(null);
    const [profileExportError, setProfileExportError] = useState<string | null>(null);
    const [exportTarget, setExportTarget] = useState<Profile | null>(null);

    const currentProfile = profiles[activeProfileId];
    const subjects = currentProfile?.subjects ?? [];
    const progress = currentProfile?.progress ?? {};
    const session = currentProfile?.session ?? DEFAULT_SESSION_STATE;
    const currentSubject = subjects.find((s) => s.id === session.subjectId);
    const importWorkflow = useImportWorkflow({
        profiles,
        subjects,
        importProfile,
        importSubjects,
        importSubjectExport
    });

    let masteryStats: MasteryStats | null = null;
    if (currentSubject) {
        const activeQuestions = getActiveQuestions(currentSubject, session.selectedTopicIds);
        const flatProgress = flattenProgress(progress[currentSubject.id]);
        masteryStats = {
            subjectMastery: calculateMastery(
                currentSubject.topics.flatMap((t) => t.questions),
                flatProgress
            ),
            selectionMastery: calculateMastery(activeQuestions, flatProgress),
            activeQuestionCount: activeQuestions.length
        };
    }

    const performProfileExport = async (profile: Profile, options: ExportOptions) => {
        try {
            const payload: Profile = options.includeProgress ? profile : {...profile, progress: {}};
            const suffix = options.includeProgress ? '' : '-content';
            await downloadExport(
                payload,
                profile.subjects,
                `requizle-profile-${toFileSlug(profile.name, 'profile')}${suffix}`,
                options
            );
            setProfileExportError(null);
        } catch (error) {
            console.error('Profile export failed:', error);
            setProfileExportError(
                error instanceof MissingMediaError ? error.message : 'Profile export failed. Try again.'
            );
        }
    };

    const handleDeleteProfileFromSettings = (profile: Profile) => {
        const isLastProfile = Object.keys(profiles).length === 1;
        if (settings.confirmProfileDelete) {
            setDeleteProfileConfirm({id: profile.id, name: profile.name});
        } else if (isLastProfile) {
            setLastProfileDeleteId(profile.id);
        } else {
            deleteProfile(profile.id);
        }
    };

    const handleResetSubjectData = () => {
        if (!currentSubject) return;
        if (!settings.confirmResetSubjectProgress) {
            resetSubjectProgress(currentSubject.id);
            return;
        }
        setResetSubjectDataConfirm({id: currentSubject.id, name: currentSubject.name});
    };

    const handleClearCache = async () => {
        setClearingCache(true);
        setCacheClearResult(null);
        try {
            const allStoredIds = await getAllMediaIds();
            const usedMediaIds = mediaIdsInProfiles(profiles);
            const orphanedIds = allStoredIds.filter((id) => !usedMediaIds.has(id));
            for (let index = 0; index < orphanedIds.length; index += CACHE_DELETE_BATCH_SIZE) {
                const chunk = orphanedIds.slice(index, index + CACHE_DELETE_BATCH_SIZE);
                await Promise.allSettled(chunk.map((id) => deleteMedia(id)));
            }
            setCacheClearResult({
                removed: orphanedIds.length,
                message:
                    orphanedIds.length > 0
                        ? `Removed ${plural(orphanedIds.length, 'unused media file')}`
                        : 'No unused data found'
            });
        } catch (err) {
            console.error('Failed to clear cache:', err);
            setCacheClearResult({
                removed: 0,
                message: 'Failed to clear cache'
            });
        } finally {
            setClearingCache(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <SidebarTabs activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'mastery' && (
                <TabPanel tab="mastery" className="space-y-6">
                    <MasteryPanel stats={masteryStats} />
                </TabPanel>
            )}

            {activeTab === 'import' && (
                <TabPanel tab="import" className="space-y-4">
                    <ImportPanel {...importWorkflow} />
                </TabPanel>
            )}

            {activeTab === 'settings' && (
                <TabPanel tab="settings" className="flex flex-col gap-4 min-h-0 -mx-1">
                    <SettingsNav selected={settingsSection} onSelect={setSettingsSection} />

                    {settingsSection === 'profiles' && (
                        <ProfilesSettingsSection
                            profiles={profiles}
                            activeProfileId={activeProfileId}
                            onRenameProfile={renameProfile}
                            onSwitchProfile={switchProfile}
                            onQuickExportProfile={(profile) => {
                                void performProfileExport(profile, DEFAULT_EXPORT_OPTIONS);
                            }}
                            onOpenProfileExportAs={setExportTarget}
                            onDeleteProfile={handleDeleteProfileFromSettings}
                            onOpenNewProfileModal={() => setNewProfileModalOpen(true)}
                            importError={importWorkflow.importError}
                            onImportFileUpload={importWorkflow.handleFileUpload}
                        />
                    )}

                    {settingsSection === 'personalization' && (
                        <PersonalizationSettingsSection
                            animatedBackground={settings.animatedBackground}
                            onSetAnimatedBackground={setAnimatedBackground}
                            soundEnabled={settings.soundEnabled}
                            onSetSoundEnabled={setSoundEnabled}
                            colorTheme={settings.colorTheme}
                            customAccentColor={settings.customAccentColor}
                            onSetColorTheme={setColorTheme}
                            onSetCustomAccentColor={setCustomAccentColor}
                        />
                    )}

                    {settingsSection === 'behavior' && (
                        <BehaviorSettingsSection
                            mode={session.mode}
                            quizRequeueOnIncorrect={settings.quizRequeueOnIncorrect}
                            quizRequeueOnSkip={settings.quizRequeueOnSkip}
                            quizRequeueGapMin={settings.quizRequeueGapMin}
                            quizRequeueGapMax={settings.quizRequeueGapMax}
                            confirmResetSubjectProgress={settings.confirmResetSubjectProgress}
                            confirmResetTopicProgress={settings.confirmResetTopicProgress}
                            confirmSubjectDelete={settings.confirmSubjectDelete}
                            confirmProfileDelete={settings.confirmProfileDelete}
                            onSetMode={setMode}
                            onSetQuizRequeueOnIncorrect={setQuizRequeueOnIncorrect}
                            onSetQuizRequeueOnSkip={setQuizRequeueOnSkip}
                            onSetQuizRequeueGaps={setQuizRequeueGaps}
                            onSetConfirmResetSubjectProgress={setConfirmResetSubjectProgress}
                            onSetConfirmResetTopicProgress={setConfirmResetTopicProgress}
                            onSetConfirmSubjectDelete={setConfirmSubjectDelete}
                            onSetConfirmProfileDelete={setConfirmProfileDelete}
                        />
                    )}

                    {settingsSection === 'data' && (
                        <DataSettingsSection
                            currentSubjectName={currentSubject?.name ?? null}
                            canResetSubjectProgress={(masteryStats?.subjectMastery ?? 0) > 0}
                            clearingCache={clearingCache}
                            cacheClearResult={cacheClearResult}
                            onResetSubjectProgress={handleResetSubjectData}
                            onClearCache={() => {
                                void handleClearCache();
                            }}
                            onFactoryReset={() => setFactoryResetConfirm(true)}
                        />
                    )}

                    {settingsSection === 'links' && <LinksSettingsSection />}
                </TabPanel>
            )}

            <SimpleConfirmModal
                open={!!resetSubjectDataConfirm}
                title="Reset subject progress?"
                confirmLabel="Reset progress"
                confirmTone="warning"
                onClose={() => setResetSubjectDataConfirm(null)}
                onConfirm={() => {
                    if (resetSubjectDataConfirm) {
                        resetSubjectProgress(resetSubjectDataConfirm.id);
                    }
                    setResetSubjectDataConfirm(null);
                }}
            >
                <p>
                    All mastery and attempts for{' '}
                    <strong className="text-slate-900 dark:text-white">{resetSubjectDataConfirm?.name}</strong> will be
                    cleared. This cannot be undone.
                </p>
            </SimpleConfirmModal>

            <TypeToConfirmModal
                open={!!deleteProfileConfirm}
                title="Delete profile"
                description={
                    <>
                        <p>
                            This will permanently delete{' '}
                            <strong className="text-slate-900 dark:text-white">{deleteProfileConfirm?.name}</strong> and
                            all its subjects, progress, and settings.
                        </p>
                        {Object.keys(profiles).length === 1 && (
                            <p className="mt-2 text-amber-600 dark:text-amber-400">
                                This is your last profile. Deleting it will reset the app to default state.
                            </p>
                        )}
                    </>
                }
                phraseToMatch={deleteProfileConfirm?.name ?? ''}
                inputPlaceholder="Type profile name..."
                onClose={() => setDeleteProfileConfirm(null)}
                onConfirm={() => {
                    if (deleteProfileConfirm) deleteProfile(deleteProfileConfirm.id);
                    setDeleteProfileConfirm(null);
                }}
            />

            <TypeToConfirmModal
                open={factoryResetConfirm}
                title="Factory reset"
                description={
                    <>
                        <p>
                            This will{' '}
                            <strong className="text-red-700 dark:text-red-400">permanently delete ALL data</strong>{' '}
                            including:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>All profiles</li>
                            <li>All subjects and questions</li>
                            <li>All progress and mastery data</li>
                            <li>All settings</li>
                        </ul>
                        <p className="text-red-700 dark:text-red-400 font-medium mt-2">This action cannot be undone.</p>
                    </>
                }
                phraseToMatch="RESET"
                inputPlaceholder="Type RESET..."
                confirmLabel="Wipe all data"
                onClose={() => setFactoryResetConfirm(false)}
                onConfirm={() => {
                    setFactoryResetConfirm(false);
                    void resetAllData();
                }}
            />

            <SimpleConfirmModal
                open={!!lastProfileDeleteId}
                title="Delete last profile?"
                confirmLabel="Delete profile"
                onClose={() => setLastProfileDeleteId(null)}
                onConfirm={() => {
                    if (lastProfileDeleteId) deleteProfile(lastProfileDeleteId);
                    setLastProfileDeleteId(null);
                }}
            >
                <p>
                    This is your last profile. Deleting it will reset the app to default state. This cannot be undone.
                </p>
            </SimpleConfirmModal>

            <MessageModal
                open={!!importWorkflow.importSuccessMessage}
                title="Import"
                message={importWorkflow.importSuccessMessage ?? ''}
                onClose={() => importWorkflow.setImportSuccessMessage(null)}
            />

            <TextPromptModal
                open={newProfileModalOpen}
                title="New profile"
                label="Profile name"
                placeholder="My profile"
                onClose={() => setNewProfileModalOpen(false)}
                onConfirm={(name) => createProfile(name)}
            />

            <PendingMediaImportModal
                pendingImport={importWorkflow.pendingImport}
                isCompleting={importWorkflow.isCompletingPendingImport}
                imageInputRef={importWorkflow.imageInputRef}
                onCancel={importWorkflow.cancelPendingImport}
                onConflictUpload={importWorkflow.handleConflictUpload}
                onSingleUpload={importWorkflow.handleSingleUpload}
                onBulkUpload={importWorkflow.handleImageUpload}
                onCompleteImport={() => {
                    void importWorkflow.completePendingImport();
                }}
            />

            <MessageModal
                open={!!profileExportError}
                title="Export"
                message={profileExportError ?? ''}
                onClose={() => setProfileExportError(null)}
            />

            <ExportOptionsModal
                open={!!exportTarget}
                title="Export profile"
                targetLabel={exportTarget?.name ?? ''}
                onClose={() => setExportTarget(null)}
                onExport={(options) => {
                    if (exportTarget) void performProfileExport(exportTarget, options);
                    setExportTarget(null);
                }}
            />
        </div>
    );
};
