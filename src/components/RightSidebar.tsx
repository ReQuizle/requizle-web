import React, {useState} from 'react';
import {useQuizStore, DEFAULT_SESSION_STATE} from '../store/useQuizStore';
import {calculateMastery, getActiveQuestions} from '../utils/quizLogic';
import {
    getAllMediaIds,
    deleteMedia
} from '../utils/mediaStorage';
import {triggerBlobDownload} from '../utils/download';
import {createRqzlArchiveBlob} from '../utils/rqzlArchive';
import {getArchiveMediaEntriesForSubjects} from '../utils/archiveMedia';
import {
    Upload,
    AlertCircle,
    ExternalLink,
    Users,
    Palette,
    SlidersHorizontal,
    Database,
    Link2
} from 'lucide-react';
import {MessageModal, SimpleConfirmModal, TextPromptModal, TypeToConfirmModal} from './AppModals';
import {clsx} from 'clsx';
import {SidebarTabs, type RightSidebarTab} from './rightSidebar/SidebarTabs';
import {PendingMediaImportModal} from './rightSidebar/PendingMediaImportModal';
import {AppearanceSettingsSection} from './rightSidebar/settings/AppearanceSettingsSection';
import {BehaviorSettingsSection} from './rightSidebar/settings/BehaviorSettingsSection';
import {DataSettingsSection} from './rightSidebar/settings/DataSettingsSection';
import {LinksSettingsSection} from './rightSidebar/settings/LinksSettingsSection';
import {ProfilesSettingsSection} from './rightSidebar/settings/ProfilesSettingsSection';
import {useImportWorkflow} from './rightSidebar/useImportWorkflow';
import type {Profile} from '../types';
import {extractAllMediaIds, flattenProgress} from '../store/quizStoreHelpers';

type SettingsSectionId = 'profiles' | 'appearance' | 'behavior' | 'data' | 'links';

const SETTINGS_SECTIONS: {id: SettingsSectionId; label: string; icon: typeof Users}[] = [
    {id: 'profiles', label: 'Profiles', icon: Users},
    {id: 'appearance', label: 'Appearance', icon: Palette},
    {id: 'behavior', label: 'Behavior', icon: SlidersHorizontal},
    {id: 'data', label: 'Data', icon: Database},
    {id: 'links', label: 'Links & help', icon: Link2}
];
const CACHE_DELETE_BATCH_SIZE = 25;

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
        setAnimatedBackground
    } = useQuizStore();
    const [activeTab, setActiveTab] = useState<RightSidebarTab>('mastery');
    const [settingsSection, setSettingsSection] = useState<SettingsSectionId>('profiles');
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [deleteProfileConfirm, setDeleteProfileConfirm] = useState<{id: string; name: string} | null>(null);
    const [lastProfileDeleteId, setLastProfileDeleteId] = useState<string | null>(null);
    const [factoryResetConfirm, setFactoryResetConfirm] = useState(false);
    const [newProfileModalOpen, setNewProfileModalOpen] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const [cacheClearResult, setCacheClearResult] = useState<{removed: number; message: string} | null>(null);
    const [resetSubjectDataConfirm, setResetSubjectDataConfirm] = useState<{id: string; name: string} | null>(null);
    const [profileExportError, setProfileExportError] = useState<string | null>(null);

    const currentProfile = profiles[activeProfileId];
    const subjects = currentProfile?.subjects ?? [];
    const progress = currentProfile?.progress ?? {};
    const session = currentProfile?.session ?? DEFAULT_SESSION_STATE;
    const currentSubject = subjects.find(s => s.id === session.subjectId);
    const {
        jsonInput,
        setJsonInput,
        importError,
        importSuccessMessage,
        setImportSuccessMessage,
        pendingImport,
        imageInputRef,
        isImporting,
        isCompletingPendingImport,
        importDndActive,
        handleImport,
        handleFileUpload,
        handleImportDragEnter,
        handleImportDragLeave,
        handleImportDragOver,
        handleImportDrop,
        handleImageUpload,
        handleConflictUpload,
        handleSingleUpload,
        completePendingImport,
        cancelPendingImport
    } = useImportWorkflow({
        activeTab,
        profiles,
        subjects,
        importProfile,
        importSubjects,
        importSubjectExport
    });

    let activeQuestionsCount = 0;
    let activeMastery = 0;
    let subjectMastery = 0;

    if (currentSubject) {
        const activeQuestions = getActiveQuestions(currentSubject, session.selectedTopicIds);
        activeQuestionsCount = activeQuestions.length;

        const flatProgress = flattenProgress(progress[currentSubject.id]);
        activeMastery = calculateMastery(activeQuestions, flatProgress);

        const allQuestions = currentSubject.topics.flatMap(t => t.questions);
        subjectMastery = calculateMastery(allQuestions, flatProgress);
    }




    const handleExportProfile = async (profile: Profile) => {
        try {
            const archiveMediaEntries = await getArchiveMediaEntriesForSubjects(profile.subjects);
            const safeName = profile.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/gi, '') || 'profile';
            const archive = await createRqzlArchiveBlob(profile, archiveMediaEntries);
            triggerBlobDownload(archive, `quiz-profile-${safeName}.rqzl`);
            setProfileExportError(null);
        } catch (error) {
            console.error('Profile export failed:', error);
            setProfileExportError('Profile export failed. Try again.');
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
            const usedMediaIds = extractAllMediaIds(profiles);
            const orphanedIds = allStoredIds.filter(id => !usedMediaIds.has(id));
            for (let index = 0; index < orphanedIds.length; index += CACHE_DELETE_BATCH_SIZE) {
                const chunk = orphanedIds.slice(index, index + CACHE_DELETE_BATCH_SIZE);
                await Promise.allSettled(chunk.map(id => deleteMedia(id)));
            }
            setCacheClearResult({
                removed: orphanedIds.length,
                message: orphanedIds.length > 0
                    ? `Removed ${orphanedIds.length} unused media file(s)`
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
                <div
                    id="right-sidebar-panel-mastery"
                    role="tabpanel"
                    aria-labelledby="right-sidebar-tab-mastery"
                    className="space-y-6 animate-in fade-in duration-300"
                >
                    {!currentSubject ? (
                        <div className="text-center text-slate-400 py-10">
                            Select a subject to view mastery
                        </div>
                    ) : (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">Subject</div>
                                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{subjectMastery}%</div>
                                    <progress
                                        className="quiz-progress quiz-progress-indigo"
                                        value={subjectMastery}
                                        max={100}
                                        aria-label="Subject mastery"
                                    />
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">Selection</div>
                                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{activeMastery}%</div>
                                    <progress
                                        className="quiz-progress quiz-progress-emerald"
                                        value={activeMastery}
                                        max={100}
                                        aria-label="Selection mastery"
                                    />
                                </div>
                            </div>

                            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                <div className="flex justify-between">
                                    <span>Active Questions:</span>
                                    <span className="font-medium text-slate-900 dark:text-slate-200">{activeQuestionsCount}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'import' && (
                <div
                    id="right-sidebar-panel-import"
                    role="tabpanel"
                    aria-labelledby="right-sidebar-tab-import"
                    className="space-y-4 animate-in fade-in duration-300"
                >
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300 space-y-2">
                        <div className="flex items-start gap-2">
                            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                            <p>Import a .rqzl, .zip, or .json file (profile, subject export, or subjects).</p>
                        </div>
                        <a
                            href="https://requizle.github.io/requizle-wiki/import-export"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                            <ExternalLink size={14} />
                            View JSON format documentation
                        </a>
                    </div>

                    <div className="space-y-2">
                        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">Import file</span>
                        <div
                            role="group"
                            aria-label="Drop a quiz file here or choose from device"
                            onDragEnter={handleImportDragEnter}
                            onDragLeave={handleImportDragLeave}
                            onDragOver={handleImportDragOver}
                            onDrop={handleImportDrop}
                            className={clsx(
                                'rounded-xl border-2 border-dashed transition-colors outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-900',
                                importDndActive
                                    ? 'border-indigo-500 bg-indigo-50/90 dark:bg-indigo-900/35'
                                    : 'border-slate-300 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/40'
                            )}
                        >
                            <input
                                id="import-file-input"
                                type="file"
                                accept=".rqzl,.zip,.json,application/json,application/zip"
                                onChange={handleFileUpload}
                                disabled={isImporting}
                                className="sr-only"
                            />
                            <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
                                <div
                                    className={clsx(
                                        'p-3 rounded-full transition-colors',
                                        importDndActive
                                            ? 'bg-indigo-200/80 dark:bg-indigo-800/50 text-indigo-700 dark:text-indigo-200'
                                            : 'bg-slate-200/80 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300'
                                    )}
                                >
                                    <Upload size={22} strokeWidth={2} aria-hidden />
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    <label
                                        htmlFor="import-file-input"
                                        className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline-offset-2 hover:underline cursor-pointer"
                                    >
                                        {isImporting ? 'Importing...' : 'Choose a file'}
                                    </label>
                                    <span className="text-slate-500 dark:text-slate-400"> or drag and drop</span>
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">.rqzl/.zip/.json (profile, subject export, or subjects)</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-50 dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-400">Or paste JSON</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder='[{"id": "math", ...}]'
                            className="w-full h-40 p-3 text-xs font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        />
                        <button
                            onClick={handleImport}
                            disabled={!jsonInput.trim() || isImporting}
                            className="w-full btn-primary flex items-center justify-center gap-2"
                        >
                            <Upload size={16} />
                            {isImporting ? 'Importing...' : 'Apply JSON'}
                        </button>
                    </div>

                    {importError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-lg break-words">
                            {importError}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div
                    id="right-sidebar-panel-settings"
                    role="tabpanel"
                    aria-labelledby="right-sidebar-tab-settings"
                    className="flex flex-col gap-4 animate-in fade-in duration-300 min-h-0 -mx-1"
                >
                    <div
                        className="sticky top-0 z-10 -mx-2 px-2 pt-0 pb-2 -mt-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800"
                    >
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-0.5">
                            Settings
                        </p>
                        <div
                            className="flex flex-col gap-1.5"
                            role="tablist"
                            aria-label="Settings categories"
                            aria-orientation="vertical"
                        >
                            {SETTINGS_SECTIONS.map(({id, label, icon: Icon}, sectionIndex) => {
                                const selected = settingsSection === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        role="tab"
                                        id={`settings-tab-${id}`}
                                        aria-selected={selected}
                                        aria-controls={`settings-panel-${id}`}
                                        tabIndex={selected ? 0 : -1}
                                        onKeyDown={(e) => {
                                            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
                                            e.preventDefault();
                                            const dir = e.key === 'ArrowDown' ? 1 : -1;
                                            const next =
                                                SETTINGS_SECTIONS[
                                                    (sectionIndex + dir + SETTINGS_SECTIONS.length) %
                                                        SETTINGS_SECTIONS.length
                                                ];
                                            setSettingsSection(next.id);
                                            requestAnimationFrame(() => {
                                                document.getElementById(`settings-tab-${next.id}`)?.focus();
                                            });
                                        }}
                                        onClick={() => setSettingsSection(id)}
                                        className={clsx(
                                            'w-full flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors border',
                                            selected
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-slate-900 dark:hover:text-white'
                                        )}
                                    >
                                        <Icon size={18} className="shrink-0 opacity-90" aria-hidden />
                                        <span className="min-w-0">{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {settingsSection === 'profiles' && (
                        <ProfilesSettingsSection
                            profiles={profiles}
                            activeProfileId={activeProfileId}
                            editingProfileId={editingProfileId}
                            editingName={editingName}
                            confirmProfileDelete={settings.confirmProfileDelete}
                            onSetEditingProfileId={setEditingProfileId}
                            onSetEditingName={setEditingName}
                            onRenameProfile={renameProfile}
                            onSwitchProfile={switchProfile}
                            onExportProfile={profile => {
                                void handleExportProfile(profile);
                            }}
                            onDeleteProfile={handleDeleteProfileFromSettings}
                            onOpenNewProfileModal={() => setNewProfileModalOpen(true)}
                            onImportFileUpload={(e) => {
                                handleFileUpload(e, true);
                            }}
                        />
                    )}

                    {settingsSection === 'appearance' && (
                        <AppearanceSettingsSection
                            animatedBackground={settings.animatedBackground}
                            onSetAnimatedBackground={setAnimatedBackground}
                        />
                    )}

                    {settingsSection === 'behavior' && (
                        <BehaviorSettingsSection
                            mode={session?.mode ?? DEFAULT_SESSION_STATE.mode}
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
                            confirmResetSubjectProgress={settings.confirmResetSubjectProgress}
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
                </div>
            )}

            <SimpleConfirmModal
                open={!!resetSubjectDataConfirm}
                title="Reset subject progress?"
                confirmLabel="Reset progress"
                confirmClassName="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
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
                title="Delete Profile"
                description={
                    <>
                        <p>
                            This will permanently delete{' '}
                            <strong className="text-slate-900 dark:text-white">{deleteProfileConfirm?.name}</strong>{' '}
                            and all its subjects, progress, and settings.
                        </p>
                        {Object.keys(profiles).length === 1 && (
                            <p className="block mt-2 text-amber-600 dark:text-amber-400">
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
                            <strong className="text-red-600 dark:text-red-400">permanently delete ALL data</strong>{' '}
                            including:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>All profiles</li>
                            <li>All subjects and questions</li>
                            <li>All progress and mastery data</li>
                            <li>All settings</li>
                        </ul>
                        <p className="text-red-600 dark:text-red-400 font-medium mt-2">This action cannot be undone.</p>
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
                open={!!importSuccessMessage}
                title="Import"
                message={importSuccessMessage ?? ''}
                onClose={() => setImportSuccessMessage(null)}
            />

            <TextPromptModal
                open={newProfileModalOpen}
                title="New profile"
                label="Profile name"
                placeholder="My profile"
                confirmLabel="Create"
                onClose={() => setNewProfileModalOpen(false)}
                onConfirm={name => createProfile(name)}
            />

            <PendingMediaImportModal
                pendingImport={pendingImport}
                isCompleting={isCompletingPendingImport}
                imageInputRef={imageInputRef}
                onCancel={cancelPendingImport}
                onConflictUpload={handleConflictUpload}
                onSingleUpload={handleSingleUpload}
                onBulkUpload={handleImageUpload}
                onCompleteImport={() => {
                    void completePendingImport();
                }}
            />

            <MessageModal
                open={!!profileExportError}
                title="Export"
                message={profileExportError ?? ''}
                onClose={() => setProfileExportError(null)}
            />
        </div>
    );
};
