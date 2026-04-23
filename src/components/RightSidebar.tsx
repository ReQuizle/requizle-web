import React, {useState, useRef, useEffect} from 'react';
import {createPortal} from 'react-dom';
import {useQuizStore, DEFAULT_SESSION_STATE} from '../store/useQuizStore';
import {calculateMastery, getActiveQuestions} from '../utils/quizLogic';
import {
    validateSubjects,
    isSubjectExportV1,
    sanitizeSubjectProgress,
    validateProfileImport,
    isImportableQuizPayload,
    extractMediaReferencesWithContext,
    getLocalMediaRefs,
    groupMediaByFilename,
    replaceMediaByPath,
    type MediaGroup
} from '../utils/importValidation';
import {
    storeMedia,
    createMediaRef,
    getAllMediaIds,
    deleteMedia,
    isIndexedDBMedia,
    extractMediaId,
    getMedia,
    restoreMediaEntry
} from '../utils/mediaStorage';
import {triggerJsonDownload} from '../utils/download';
import {readFileAsText} from '../utils/fileReaders';
import {
    Upload,
    Trash2,
    AlertCircle,
    Download,
    Plus,
    ExternalLink,
    Pencil,
    Check,
    X,
    ImageIcon,
    BookOpen,
    MessageSquare,
    Github,
    Users,
    Palette,
    SlidersHorizontal,
    Database,
    Link2,
    Shuffle,
    ListOrdered
} from 'lucide-react';
import {ThemeToggle} from './ThemeToggle';
import {MessageModal, SimpleConfirmModal, TextPromptModal, TypeToConfirmModal} from './AppModals';
import {clsx} from 'clsx';

type SettingsSectionId = 'profiles' | 'appearance' | 'behavior' | 'data' | 'links';

const SETTINGS_SECTIONS: {id: SettingsSectionId; label: string; icon: typeof Users}[] = [
    {id: 'profiles', label: 'Profiles', icon: Users},
    {id: 'appearance', label: 'Appearance', icon: Palette},
    {id: 'behavior', label: 'Behavior', icon: SlidersHorizontal},
    {id: 'data', label: 'Data', icon: Database},
    {id: 'links', label: 'Links & help', icon: Link2}
];

type EmbeddedMediaEntry = {id: string; data: string; filename: string};

type SettingsSwitchRowProps = {
    title: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
};

const SettingsSwitchRow: React.FC<SettingsSwitchRowProps> = ({title, description, checked, onChange}) => (
    <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer gap-3">
        <div className="min-w-0">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 block">{title}</span>
            {description && (
                <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span>
            )}
        </div>
        <div className="relative flex items-center flex-shrink-0">
            <input
                type="checkbox"
                className="toggle-switch-input"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <div className="toggle-switch-track"></div>
        </div>
    </label>
);

function isEmbeddedMediaEntry(value: unknown): value is EmbeddedMediaEntry {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const entry = value as Record<string, unknown>;
    return (
        typeof entry.id === 'string' &&
        typeof entry.data === 'string' &&
        entry.data.startsWith('data:') &&
        typeof entry.filename === 'string'
    );
}

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
    const [activeTab, setActiveTab] = useState<'mastery' | 'import' | 'settings'>('mastery');
    const [settingsSection, setSettingsSection] = useState<SettingsSectionId>('profiles');
    const [jsonInput, setJsonInput] = useState('');
    const [importError, setImportError] = useState<string | null>(null);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [deleteProfileConfirm, setDeleteProfileConfirm] = useState<{id: string; name: string} | null>(null);
    const [lastProfileDeleteId, setLastProfileDeleteId] = useState<string | null>(null);
    const [factoryResetConfirm, setFactoryResetConfirm] = useState(false);
    const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
    const [newProfileModalOpen, setNewProfileModalOpen] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const [cacheClearResult, setCacheClearResult] = useState<{removed: number; message: string} | null>(null);
    const [importDndActive, setImportDndActive] = useState(false);
    const importDndDepth = useRef(0);
    const [resetSubjectDataConfirm, setResetSubjectDataConfirm] = useState<{id: string; name: string} | null>(null);

    // Image upload state
    const [pendingImport, setPendingImport] = useState<{
        data: unknown;
        mediaGroups: MediaGroup[];
        uploadError: string | null;
    } | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeTab !== 'import') {
            importDndDepth.current = 0;
            setImportDndActive(false);
        }
    }, [activeTab]);

    const currentProfile = profiles[activeProfileId];
    const subjects = currentProfile?.subjects ?? [];
    const progress = currentProfile?.progress ?? {};
    const session = currentProfile?.session ?? DEFAULT_SESSION_STATE;
    const currentSubject = subjects.find(s => s.id === session.subjectId);

    // Calculate stats
    let activeQuestionsCount = 0;
    let activeMastery = 0;
    let subjectMastery = 0;

    if (currentSubject) {
        const activeQuestions = getActiveQuestions(currentSubject, session.selectedTopicIds);
        activeQuestionsCount = activeQuestions.length;

        const flatProgress = Object.values(progress[currentSubject.id] || {}).reduce((acc, val) => ({...acc, ...val}), {});
        activeMastery = calculateMastery(activeQuestions, flatProgress);

        const allQuestions = currentSubject.topics.flatMap(t => t.questions);
        subjectMastery = calculateMastery(allQuestions, flatProgress);
    }




    // Perform the actual import after images are handled
    const performImport = (parsed: unknown): {type: 'profile' | 'subjects'; message: string} => {
        // Check if it's a profile (has profile-specific fields)
        if (isSubjectExportV1(parsed)) {
            importSubjectExport(parsed);
            const subj = parsed.subject;
            const label = typeof subj.name === 'string' ? subj.name : subj.id;
            const validProgress = sanitizeSubjectProgress(parsed.progress, parsed.subject);
            const hasProgress = Object.values(validProgress).some(qMap => Object.keys(qMap).length > 0);
            return {
                type: 'subjects',
                message: hasProgress ? `Imported "${label}" with progress.` : `Imported "${label}".`
            };
        }

        try {
            const profile = validateProfileImport(parsed);
            const existingProfile = profiles[profile.id];
            importProfile(profile);
            const action = existingProfile ? 'merged with existing' : 'imported';
            return {type: 'profile', message: `Profile "${profile.name}" ${action} successfully!`};
        } catch {
            // Not a valid profile import. Fall through and try subject import.
        }

        // Otherwise, try to import as subjects
        const validatedSubjects = validateSubjects(parsed);
        const existingSubjectIds = subjects.map(s => s.id);
        const mergedCount = validatedSubjects.filter(s => existingSubjectIds.includes(s.id)).length;
        const newCount = validatedSubjects.length - mergedCount;

        importSubjects(validatedSubjects);

        let message = '';
        if (mergedCount > 0 && newCount > 0) {
            message = `Merged ${mergedCount} existing subject(s) and added ${newCount} new subject(s)`;
        } else if (mergedCount > 0) {
            message = `Merged ${mergedCount} subject(s) with existing data`;
        } else {
            message = `Added ${newCount} new subject(s)`;
        }

        return {type: 'subjects', message};
    };

    // Check for local media and either import directly or prompt for upload
    const detectAndImport = async (parsed: unknown): Promise<{type: 'profile' | 'subjects' | 'pending'; message: string}> => {
        if (!isImportableQuizPayload(parsed)) {
            throw new Error('Invalid import format: expected a profile, subject export, subject, or subject array');
        }

        // Check for embedded media in profile export
        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            '_media' in parsed &&
            Array.isArray((parsed as Record<string, unknown>)._media)
        ) {
            const mediaList = ((parsed as Record<string, unknown>)._media as unknown[]).filter(isEmbeddedMediaEntry);

            // Restore media to IndexedDB
            for (const item of mediaList) {
                // Check if already exists to avoid duplicate work
                const existing = await getMedia(item.id);
                if (!existing) {
                    try {
                        await restoreMediaEntry(item);
                    } catch (e) {
                        console.error(`Failed to restore media ${item.id}`, e);
                    }
                }
            }
        }

        const allRefs = extractMediaReferencesWithContext(parsed);
        const localRefs = getLocalMediaRefs(allRefs);

        if (localRefs.length > 0) {
            const mediaGroups = groupMediaByFilename(localRefs);
            setPendingImport({
                data: parsed,
                mediaGroups,
                uploadError: null
            });
            const conflictCount = mediaGroups.filter(g => g.isConflict).length;
            return {
                type: 'pending',
                message: `Found ${mediaGroups.length} media file(s). ${conflictCount > 0 ? `${conflictCount} have naming conflicts.` : ''}`
            };
        }

        // No local media (or all are idb/remote), import directly
        return performImport(parsed);
    };

    // Handle bulk image file selection for non-conflict media
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!pendingImport || !e.target.files) return;

        const files = Array.from(e.target.files);

        // Only process non-conflict groups with bulk upload
        const nonConflictFilenames = pendingImport.mediaGroups
            .filter(g => !g.isConflict && !g.uploaded)
            .map(g => g.filename);

        const validFiles = files.filter(file => nonConflictFilenames.includes(file.name));
        const skipped = files.filter(file => !nonConflictFilenames.includes(file.name)).map(f => f.name);

        if (validFiles.length === 0) {
            setPendingImport({
                ...pendingImport,
                uploadError: skipped.length > 0
                    ? `Skipped: ${skipped.join(', ')} (not in required list or is a conflict)`
                    : 'No matching files selected'
            });
            e.target.value = '';
            return;
        }

        // Track processing with a map of filename -> dataUri
        const uploadResults = new Map<string, string>();
        const failedFiles: string[] = [];
        let processedCount = 0;
        const totalToProcess = validFiles.length;

        const finalizeUploads = () => {
            // Use functional update with all results at once
            setPendingImport(prev => {
                if (!prev) return prev;

                const newMediaGroups = prev.mediaGroups.map(group => {
                    if (group.isConflict) return group;
                    const dataUri = uploadResults.get(group.filename);
                    if (dataUri) {
                        return {
                            ...group,
                            uploaded: true,
                            uploadedDataUri: dataUri
                        };
                    }
                    return group;
                });

                const notices: string[] = [];
                if (skipped.length > 0) {
                    notices.push(`Skipped ${skipped.length} file(s) not in required list`);
                }
                if (failedFiles.length > 0) {
                    notices.push(`Failed to read: ${failedFiles.join(', ')}`);
                }

                return {
                    ...prev,
                    mediaGroups: newMediaGroups,
                    uploadError: notices.length > 0 ? notices.join('. ') : null
                };
            });
        };

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUri = event.target?.result as string;
                uploadResults.set(file.name, dataUri);
                processedCount++;

                if (processedCount === totalToProcess) {
                    finalizeUploads();
                }
            };
            reader.onerror = () => {
                failedFiles.push(file.name);
                processedCount++;
                if (processedCount === totalToProcess) {
                    finalizeUploads();
                }
            };
            reader.onabort = () => {
                failedFiles.push(file.name);
                processedCount++;
                if (processedCount === totalToProcess) {
                    finalizeUploads();
                }
            };
            reader.readAsDataURL(file);
        });

        e.target.value = '';
    };

    // Handle individual upload for a specific conflict reference
    const handleConflictUpload = (groupIndex: number, refIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
            const dataUri = event.target?.result as string;

            // Use functional update to get latest state
            setPendingImport(prev => {
                if (!prev) return prev;

                const newMediaGroups = prev.mediaGroups.map((group, idx) => {
                    if (idx !== groupIndex) return group;

                    // Get or create the per-ref upload map
                    const refMap = new Map(group.uploadedPerRef || []);
                    refMap.set(group.references[refIndex].path, dataUri);

                    // Check if all refs in this conflict group are uploaded
                    const allUploaded = group.references.every(ref => refMap.has(ref.path));

                    return {
                        ...group,
                        uploaded: allUploaded,
                        uploadedPerRef: refMap
                    };
                });

                return {
                    ...prev,
                    mediaGroups: newMediaGroups,
                    uploadError: null
                };
            });
        };

        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Handle individual upload for non-conflict groups (single file applies to all usages)
    const handleSingleUpload = (groupIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
            const dataUri = event.target?.result as string;

            // Use functional update to get latest state
            setPendingImport(prev => {
                if (!prev) return prev;

                const newMediaGroups = prev.mediaGroups.map((group, idx) => {
                    if (idx !== groupIndex) return group;
                    return {
                        ...group,
                        uploaded: true,
                        uploadedDataUri: dataUri
                    };
                });

                return {
                    ...prev,
                    mediaGroups: newMediaGroups,
                    uploadError: null
                };
            });
        };

        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Complete the import with uploaded images
    const completePendingImport = async () => {
        if (!pendingImport) return;

        const {data, mediaGroups} = pendingImport;

        // Check all media is uploaded
        const missingGroups = mediaGroups.filter(g => !g.uploaded);
        if (missingGroups.length > 0) {
            const missingNames = missingGroups.map(g => g.filename).join(', ');
            setPendingImport({
                ...pendingImport,
                uploadError: `Missing files: ${missingNames}`
            });
            return;
        }

        try {
            // Store each media file in IndexedDB and create a mapping from full path to idb: reference
            const mediaRefMap = new Map<string, string>();

            for (const group of mediaGroups) {
                if (group.isConflict) {
                    // For conflicts, each reference has its own upload
                    const refMap = group.uploadedPerRef;
                    if (!refMap) continue;
                    for (const ref of group.references) {
                        const dataUri = refMap.get(ref.path);
                        if (dataUri) {
                            const mediaId = await storeMedia(dataUri, ref.filename);
                            mediaRefMap.set(ref.path, createMediaRef(mediaId));
                        }
                    }
                } else {
                    // For non-conflicts, all references use the same upload
                    if (group.uploadedDataUri) {
                        const mediaId = await storeMedia(group.uploadedDataUri, group.filename);
                        const idbRef = createMediaRef(mediaId);
                        for (const ref of group.references) {
                            mediaRefMap.set(ref.path, idbRef);
                        }
                    }
                }
            }

            // Replace media paths with IndexedDB references (using full path as key)
            const processedData = replaceMediaByPath(data, mediaRefMap);

            const result = performImport(processedData);
            setPendingImport(null);
            setJsonInput('');
            setImportError(null);
            setImportSuccessMessage(result.message);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            setPendingImport({
                ...pendingImport,
                uploadError: `Import failed: ${errorMessage}`
            });
        }
    };



    // Cancel pending import
    const cancelPendingImport = () => {
        setPendingImport(null);
        setImportError(null);
    };

    const handleImport = () => {
        try {
            const parsed: unknown = JSON.parse(jsonInput);
            detectAndImport(parsed).then(result => {
                if (result.type === 'pending') {
                    // Don't clear input or show success - waiting for images
                    setImportError(null);
                    return;
                }

                setJsonInput('');
                setImportError(null);
                setImportSuccessMessage(result.message);
            }).catch(e => {
                setImportError(`Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
            });
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            setImportError(`Import failed: ${errorMessage}`);
        }
    };

    const readAndImportFile = (file: File) => {
        const lowerName = file.name.toLowerCase();
        if (!(lowerName.endsWith('.json') || lowerName.endsWith('.rqzl'))) {
            setImportError('Unsupported file type. Use .rqzl or .json files.');
            return;
        }
        readFileAsText(file)
            .then(content => {
                const parsed: unknown = JSON.parse(content);
                return detectAndImport(parsed);
            })
            .then(result => {
                if (result.type === 'pending') {
                    setImportError(null);
                    return;
                }

                setJsonInput('');
                setImportError(null);
                setImportSuccessMessage(result.message);
            })
            .catch(e => {
                const errorMessage = e instanceof Error ? e.message : 'Unknown error';
                if (errorMessage.includes('read file')) {
                    setImportError('Could not read that file. Try another file or paste JSON below.');
                } else {
                    setImportError(`File import failed: ${errorMessage}`);
                }
            });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, resetInput = true) => {
        const file = e.target.files?.[0];
        if (!file) return;
        readAndImportFile(file);
        if (resetInput) {
            e.target.value = '';
        }
    };

    const handleImportDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        importDndDepth.current += 1;
        setImportDndActive(true);
    };

    const handleImportDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        importDndDepth.current -= 1;
        if (importDndDepth.current <= 0) {
            importDndDepth.current = 0;
            setImportDndActive(false);
        }
    };

    const handleImportDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleImportDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        importDndDepth.current = 0;
        setImportDndActive(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        readAndImportFile(file);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                <button
                    type="button"
                    onClick={() => setActiveTab('mastery')}
                    className={clsx(
                        'flex-1 py-1.5 text-sm font-medium rounded-md transition-all',
                        activeTab === 'mastery'
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    )}
                >
                    Mastery
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('import')}
                    className={clsx(
                        'flex-1 py-1.5 text-sm font-medium rounded-md transition-all',
                        activeTab === 'import'
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    )}
                >
                    Import
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className={clsx(
                        'flex-1 py-1.5 text-sm font-medium rounded-md transition-all',
                        activeTab === 'settings'
                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    )}
                >
                    Settings
                </button>
            </div>

            {activeTab === 'mastery' && (
                <div className="space-y-6 animate-in fade-in duration-300">
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
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300 space-y-2">
                        <div className="flex items-start gap-2">
                            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                            <p>Import a .rqzl (Profile) or .json (Subjects) file.</p>
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
                                accept=".rqzl,.json,application/json"
                                onChange={handleFileUpload}
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
                                        Choose a file
                                    </label>
                                    <span className="text-slate-500 dark:text-slate-400"> or drag and drop</span>
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">.rqzl (profile) or .json (subjects)</p>
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
                            disabled={!jsonInput.trim()}
                            className="w-full btn-primary flex items-center justify-center gap-2"
                        >
                            <Upload size={16} />
                            Apply JSON
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
                    className="flex flex-col gap-4 animate-in fade-in duration-300 min-h-0 -mx-1"
                    role="region"
                    aria-label="Settings"
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
                        <div
                            id="settings-panel-profiles"
                            role="tabpanel"
                            aria-labelledby="settings-tab-profiles"
                            className="space-y-3"
                        >
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Profiles</h3>

                        <div className="space-y-2">
                            {Object.values(profiles).sort((a, b) => b.createdAt - a.createdAt).map(profile => (
                                <div
                                    key={profile.id}
                                    className={clsx(
                                        "p-3 rounded-lg border transition-all group",
                                        activeProfileId === profile.id
                                            ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800"
                                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {editingProfileId === profile.id ? (
                                                <div className="flex items-center gap-1 flex-1">
                                                    <input
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && editingName.trim()) {
                                                                renameProfile(profile.id, editingName.trim());
                                                                setEditingProfileId(null);
                                                            } else if (e.key === 'Escape') {
                                                                setEditingProfileId(null);
                                                            }
                                                        }}
                                                        className="flex-1 px-2 py-0.5 text-sm font-medium border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            if (editingName.trim()) {
                                                                renameProfile(profile.id, editingName.trim());
                                                                setEditingProfileId(null);
                                                            }
                                                        }}
                                                        className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                                        title="Save"
                                                    >
                                                        <Check size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingProfileId(null)}
                                                        className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                                        title="Cancel"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className={clsx(
                                                        "font-medium text-sm truncate",
                                                        activeProfileId === profile.id ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-slate-200"
                                                    )}>
                                                        {profile.name}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setEditingProfileId(profile.id);
                                                            setEditingName(profile.name);
                                                        }}
                                                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Rename Profile"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                    {activeProfileId === profile.id && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold uppercase flex-shrink-0">
                                                            Active
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        {editingProfileId !== profile.id && (
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button
                                                    onClick={async () => {
                                                        // Extract media IDs from this profile
                                                        const mediaIds = new Set<string>();
                                                        profile.subjects.forEach(subject => {
                                                            subject.topics.forEach(topic => {
                                                                topic.questions.forEach(q => {
                                                                    if (q.media && isIndexedDBMedia(q.media)) {
                                                                        mediaIds.add(extractMediaId(q.media));
                                                                    }
                                                                });
                                                            });
                                                        });

                                                        // Fetch media data
                                                        const mediaExports = [];
                                                        for (const id of mediaIds) {
                                                            const media = await getMedia(id);
                                                            if (media) {
                                                                mediaExports.push({
                                                                    id: media.id,
                                                                    data: media.data,
                                                                    filename: media.filename,
                                                                    mimeType: media.mimeType
                                                                });
                                                            }
                                                        }

                                                        const exportData = {
                                                            ...profile,
                                                            _media: mediaExports
                                                        };

                                                        const safeName = profile.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/gi, '') || 'profile';
                                                        triggerJsonDownload(exportData, `quiz-profile-${safeName}.rqzl`);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                                    title="Export Profile"
                                                >
                                                    <Download size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const isLastProfile = Object.keys(profiles).length === 1;

                                                        if (settings.confirmProfileDelete) {
                                                            setDeleteProfileConfirm({id: profile.id, name: profile.name});
                                                        } else if (isLastProfile) {
                                                            setLastProfileDeleteId(profile.id);
                                                        } else {
                                                            deleteProfile(profile.id);
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    title="Delete Profile"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                        <span>{profile.subjects.length} Subjects</span>
                                        {activeProfileId !== profile.id && (
                                            <button
                                                onClick={() => switchProfile(profile.id)}
                                                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                            >
                                                Switch to this profile
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setNewProfileModalOpen(true)}
                                className="flex items-center justify-center gap-2 p-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-xs font-medium"
                            >
                                <Plus size={14} />
                                New Profile
                            </button>
                            <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-xs font-medium cursor-pointer">
                                <Upload size={14} />
                                Import Data
                                <input
                                    type="file"
                                    accept=".rqzl,.json"
                                    className="hidden"
                                    onChange={(e) => {
                                        handleFileUpload(e, true);
                                    }}
                                />
                            </label>
                        </div>
                        </div>
                    )}

                    {settingsSection === 'appearance' && (
                        <div
                            id="settings-panel-appearance"
                            role="tabpanel"
                            aria-labelledby="settings-tab-appearance"
                            className="space-y-3"
                        >
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Appearance</h3>
                        <div className="flex items-center justify-between p-3 min-h-[52px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Theme</span>
                            <ThemeToggle />
                        </div>
                        <SettingsSwitchRow
                            title="Animated background"
                            checked={settings.animatedBackground}
                            onChange={setAnimatedBackground}
                        />
                        </div>
                    )}

                    {settingsSection === 'behavior' && (
                        <div
                            id="settings-panel-behavior"
                            role="tabpanel"
                            aria-labelledby="settings-tab-behavior"
                            className="space-y-3"
                        >
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Behavior</h3>

                        <div className="space-y-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Controls how study queues are built and how missed or skipped questions come back. The shuffle button in the quiz header uses the same order setting.
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quiz order</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setMode('random')}
                                    className={clsx(
                                        'flex items-center justify-center gap-2 min-h-[44px] px-2 rounded-lg text-xs font-semibold border transition-colors',
                                        session?.mode === 'random'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600'
                                    )}
                                >
                                    <Shuffle size={16} aria-hidden />
                                    Random
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('topic_order')}
                                    className={clsx(
                                        'flex items-center justify-center gap-2 min-h-[44px] px-2 rounded-lg text-xs font-semibold border transition-colors',
                                        session?.mode === 'topic_order'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600'
                                    )}
                                >
                                    <ListOrdered size={16} aria-hidden />
                                    Topic order
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Random shuffles the active pool; topic order follows sidebar topic order.
                            </p>
                        </div>

                        <div className="space-y-2 pt-1">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Missed &amp; skipped questions</p>
                            <SettingsSwitchRow
                                title="Requeue after wrong answer"
                                description="Put the card back in the queue so it returns later"
                                checked={settings.quizRequeueOnIncorrect}
                                onChange={setQuizRequeueOnIncorrect}
                            />
                            <SettingsSwitchRow
                                title="Requeue after skip"
                                description="Same spacing as wrong answers when enabled"
                                checked={settings.quizRequeueOnSkip}
                                onChange={setQuizRequeueOnSkip}
                            />
                            <div
                                className={clsx(
                                    'space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3',
                                    !settings.quizRequeueOnIncorrect && !settings.quizRequeueOnSkip && 'opacity-50 pointer-events-none'
                                )}
                            >
                                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Reinsert spacing</p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Random number of positions ahead (0 = front of remaining queue). App default was 4-6.
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label htmlFor="quiz-gap-min" className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                                            Min
                                        </label>
                                        <input
                                            id="quiz-gap-min"
                                            type="number"
                                            min={0}
                                            max={100}
                                            inputMode="numeric"
                                            value={settings.quizRequeueGapMin}
                                            onChange={(e) => {
                                                const v = parseInt(e.target.value, 10);
                                                if (Number.isNaN(v)) return;
                                                setQuizRequeueGaps(v, settings.quizRequeueGapMax);
                                            }}
                                            className="w-full px-2 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="quiz-gap-max" className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                                            Max
                                        </label>
                                        <input
                                            id="quiz-gap-max"
                                            type="number"
                                            min={0}
                                            max={100}
                                            inputMode="numeric"
                                            value={settings.quizRequeueGapMax}
                                            onChange={(e) => {
                                                const v = parseInt(e.target.value, 10);
                                                if (Number.isNaN(v)) return;
                                                setQuizRequeueGaps(settings.quizRequeueGapMin, v);
                                            }}
                                            className="w-full px-2 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pt-1">Progress resets</p>
                        <SettingsSwitchRow
                            title="Confirm reset subject progress"
                            description="Dialog before clearing all mastery for a subject"
                            checked={settings.confirmResetSubjectProgress}
                            onChange={setConfirmResetSubjectProgress}
                        />
                        <SettingsSwitchRow
                            title="Confirm reset topic progress"
                            description="Dialog before clearing mastery for one topic"
                            checked={settings.confirmResetTopicProgress}
                            onChange={setConfirmResetTopicProgress}
                        />

                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pt-1">Deletion safety</p>
                        <SettingsSwitchRow
                            title="Confirm subject deletion"
                            description="Require typing name to delete; when off, delete immediately"
                            checked={settings.confirmSubjectDelete}
                            onChange={setConfirmSubjectDelete}
                        />
                        <SettingsSwitchRow
                            title="Confirm profile deletion"
                            description="Require typing name to delete"
                            checked={settings.confirmProfileDelete}
                            onChange={setConfirmProfileDelete}
                        />
                        </div>
                    )}

                    {settingsSection === 'data' && (
                        <div
                            id="settings-panel-data"
                            role="tabpanel"
                            aria-labelledby="settings-tab-data"
                            className="space-y-3"
                        >
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data Management</h3>

                        {currentSubject && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (!settings.confirmResetSubjectProgress) {
                                        resetSubjectProgress(currentSubject.id);
                                        return;
                                    }
                                    setResetSubjectDataConfirm({id: currentSubject.id, name: currentSubject.name});
                                }}
                                className="w-full flex items-center justify-center gap-2 p-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-sm font-medium"
                            >
                                <Trash2 size={16} />
                                Reset Subject Progress
                            </button>
                        )}

                        <button
                            onClick={async () => {
                                setClearingCache(true);
                                setCacheClearResult(null);
                                try {
                                    // Get all media IDs in IndexedDB
                                    const allStoredIds = await getAllMediaIds();

                                    // Collect all media IDs still in use across all profiles
                                    const usedMediaIds = new Set<string>();
                                    for (const profile of Object.values(profiles)) {
                                        for (const subject of profile.subjects) {
                                            for (const topic of subject.topics) {
                                                for (const question of topic.questions) {
                                                    if (question.media && isIndexedDBMedia(question.media)) {
                                                        usedMediaIds.add(extractMediaId(question.media));
                                                    }
                                                }
                                            }
                                        }
                                    }

                                    // Find orphaned media (stored but not used)
                                    const orphanedIds = allStoredIds.filter(id => !usedMediaIds.has(id));

                                    // Delete orphaned media
                                    for (const id of orphanedIds) {
                                        await deleteMedia(id);
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
                            }}
                            disabled={clearingCache}
                            className="w-full flex items-center justify-center gap-2 p-3 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            <Trash2 size={16} />
                            {clearingCache ? 'Clearing...' : 'Clear Cache'}
                        </button>

                        {cacheClearResult && (
                            <div className={`p-2 rounded-lg text-xs text-center ${cacheClearResult.removed > 0
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                }`}>
                                {cacheClearResult.message}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setFactoryResetConfirm(true)}
                            className="w-full flex items-center justify-center gap-2 p-3 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium"
                        >
                            <AlertCircle size={16} />
                            Wipe All Data (Factory Reset)
                        </button>
                        </div>
                    )}

                    {settingsSection === 'links' && (
                        <div
                            id="settings-panel-links"
                            role="tabpanel"
                            aria-labelledby="settings-tab-links"
                            className="space-y-3"
                        >
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Links &amp; help</h3>
                        <div className="grid grid-cols-1 gap-2">
                            <a
                                href="https://requizle.github.io/requizle-wiki/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                                        <BookOpen size={16} />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 block">Documentation</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Guides and Tutorials</span>
                                    </div>
                                </div>
                                <ExternalLink size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            </a>

                            <a
                                href="https://github.com/ReQuizle/requizle-web"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors">
                                        <Github size={16} />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 block">Source Code</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">View on GitHub</span>
                                    </div>
                                </div>
                                <ExternalLink size={14} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                            </a>

                            <a
                                href="https://github.com/ReQuizle/requizle-web/issues"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 transition-colors">
                                        <MessageSquare size={16} />
                                    </div>
                                    <div className="text-left">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 block">Report Issue</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">Bug reports & feedback</span>
                                    </div>
                                </div>
                                <ExternalLink size={14} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                            </a>
                        </div>
                        </div>
                    )}
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

            {/* Image Upload Modal for Pending Import */}
            {pendingImport && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                <ImageIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload Media</h3>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Your import contains local media references. Please upload the required files:
                        </p>

                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {pendingImport.mediaGroups.map((group, groupIndex) => {
                                const hasConflict = group.isConflict;
                                const refMap = group.uploadedPerRef;

                                return (
                                    <div key={group.filename} className="space-y-1">
                                        {/* Filename header */}
                                        <div className={clsx(
                                            "flex items-center justify-between p-2 rounded-lg text-sm",
                                            group.uploaded
                                                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                                : hasConflict
                                                    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                                                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                                        )}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium truncate">{group.filename}</span>
                                                {hasConflict && (
                                                    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                                                        <AlertCircle size={12} />
                                                        Conflict
                                                    </span>
                                                )}
                                            </div>
                                            {group.uploaded ? (
                                                <Check className="w-4 h-4 flex-shrink-0" />
                                            ) : (
                                                <X className="w-4 h-4 flex-shrink-0 opacity-50" />
                                            )}
                                        </div>

                                        {/* Context: which subjects/topics use this file */}
                                        {hasConflict ? (
                                            // For conflicts, show each reference with its own upload
                                            <div className="ml-4 space-y-1">
                                                {group.references.map((ref, refIndex) => {
                                                    const isRefUploaded = refMap?.has(ref.path);
                                                    return (
                                                        <div key={ref.path} className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-700/50">
                                                            <span className="text-slate-600 dark:text-slate-400 truncate">
                                                                {ref.subjectName} → {ref.topicName}
                                                            </span>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                {isRefUploaded ? (
                                                                    <Check className="w-3 h-3 text-green-500" />
                                                                ) : (
                                                                    <>
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*,video/*"
                                                                            onChange={(e) => handleConflictUpload(groupIndex, refIndex, e)}
                                                                            className="hidden"
                                                                            id={`conflict-${groupIndex}-${refIndex}`}
                                                                        />
                                                                        <label
                                                                            htmlFor={`conflict-${groupIndex}-${refIndex}`}
                                                                            className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900"
                                                                        >
                                                                            Upload
                                                                        </label>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            // For non-conflicts, show context with individual upload option
                                            <div className="ml-4 flex items-center justify-between text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-700/50">
                                                <span className="text-slate-500 dark:text-slate-400 truncate">
                                                    {group.references.map(r => `${r.subjectName} → ${r.topicName}`).join(', ')}
                                                </span>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {group.uploaded ? (
                                                        <Check className="w-3 h-3 text-green-500" />
                                                    ) : (
                                                        <>
                                                            <input
                                                                type="file"
                                                                accept="image/*,video/*"
                                                                onChange={(e) => handleSingleUpload(groupIndex, e)}
                                                                className="hidden"
                                                                id={`single-${groupIndex}`}
                                                            />
                                                            <label
                                                                htmlFor={`single-${groupIndex}`}
                                                                className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900"
                                                            >
                                                                Upload
                                                            </label>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Upload stats */}
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {pendingImport.mediaGroups.filter(g => g.uploaded).length} of {pendingImport.mediaGroups.length} files ready
                        </div>

                        {/* Error/Warning display */}
                        {pendingImport.uploadError && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{pendingImport.uploadError}</span>
                            </div>
                        )}

                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                        />

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={cancelPendingImport}
                                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            {pendingImport.mediaGroups.some(g => !g.isConflict && !g.uploaded) && (
                                <button
                                    onClick={() => imageInputRef.current?.click()}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    <Upload className="w-4 h-4" />
                                    Upload Files
                                </button>
                            )}
                        </div>

                        {pendingImport.mediaGroups.every(g => g.uploaded) && (
                            <button
                                onClick={completePendingImport}
                                className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Complete Import
                            </button>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
