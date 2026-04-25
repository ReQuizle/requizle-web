import {useEffect, useRef, useState} from 'react';
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
} from '../../utils/importValidation';
import {
    storeMedia,
    createMediaRef,
    deleteMedia
} from '../../utils/mediaStorage';
import {readFileAsText} from '../../utils/fileReaders';
import {parseRqzlArchiveFile} from '../../utils/rqzlArchive';
import type {Profile, Subject, SubjectExportV1} from '../../types';

type ImportResult = {type: 'profile' | 'subjects'; message: string};

type UseImportWorkflowParams = {
    activeTab: 'mastery' | 'import' | 'settings';
    profiles: Record<string, Profile>;
    subjects: Subject[];
    importProfile: (profile: Profile) => void;
    importSubjects: (subjects: Subject[]) => void;
    importSubjectExport: (bundle: SubjectExportV1) => void;
};

export function useImportWorkflow({
    activeTab,
    profiles,
    subjects,
    importProfile,
    importSubjects,
    importSubjectExport
}: UseImportWorkflowParams) {
    const [jsonInput, setJsonInput] = useState('');
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
    const [pendingImport, setPendingImport] = useState<{
        data: unknown;
        mediaGroups: MediaGroup[];
        uploadError: string | null;
    } | null>(null);
    const [importDndActive, setImportDndActive] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isCompletingPendingImport, setIsCompletingPendingImport] = useState(false);
    const importDndDepth = useRef(0);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const pendingStagedMediaIdsRef = useRef<string[]>([]);
    const importInFlightRef = useRef(false);

    useEffect(() => {
        if (activeTab !== 'import') {
            importDndDepth.current = 0;
            setImportDndActive(false);
        }
    }, [activeTab]);

    const runImportTask = async (task: () => Promise<void>) => {
        if (importInFlightRef.current) return;
        importInFlightRef.current = true;
        setIsImporting(true);
        try {
            await task();
        } finally {
            importInFlightRef.current = false;
            setIsImporting(false);
        }
    };

    const performImport = (parsed: unknown): ImportResult => {
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
            // Not a profile import. Fall through to subjects import validation.
        }

        const validatedSubjects = validateSubjects(parsed);
        const existingSubjectIds = subjects.map(s => s.id);
        const mergedCount = validatedSubjects.filter(s => existingSubjectIds.includes(s.id)).length;
        const newCount = validatedSubjects.length - mergedCount;
        importSubjects(validatedSubjects);

        if (mergedCount > 0 && newCount > 0) {
            return {type: 'subjects', message: `Merged ${mergedCount} existing subject(s) and added ${newCount} new subject(s)`};
        }
        if (mergedCount > 0) {
            return {type: 'subjects', message: `Merged ${mergedCount} subject(s) with existing data`};
        }
        return {type: 'subjects', message: `Added ${newCount} new subject(s)`};
    };

    const detectAndImport = async (parsed: unknown): Promise<{type: 'profile' | 'subjects' | 'pending'; message: string}> => {
        if (!isImportableQuizPayload(parsed)) {
            throw new Error('Invalid import format: expected a profile, subject export, subject, or subject array');
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

        return performImport(parsed);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!pendingImport || !e.target.files) return;
        const files = Array.from(e.target.files);
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

        const uploadResults = new Map<string, File>();
        validFiles.forEach(file => {
            uploadResults.set(file.name, file);
        });

        setPendingImport(prev => {
            if (!prev) return prev;
            const newMediaGroups = prev.mediaGroups.map(group => {
                if (group.isConflict) return group;
                const uploadedFile = uploadResults.get(group.filename);
                if (!uploadedFile) return group;
                return {...group, uploaded: true, uploadedFile};
            });
            const notices: string[] = [];
            if (skipped.length > 0) {
                notices.push(`Skipped ${skipped.length} file(s) not in required list`);
            }
            return {
                ...prev,
                mediaGroups: newMediaGroups,
                uploadError: notices.length > 0 ? notices.join('. ') : null
            };
        });

        e.target.value = '';
    };

    const handleConflictUpload = (groupIndex: number, refIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        setPendingImport(prev => {
            if (!prev) return prev;
            const newMediaGroups = prev.mediaGroups.map((group, idx) => {
                if (idx !== groupIndex) return group;
                const refMap = new Map(group.uploadedPerRef || []);
                refMap.set(group.references[refIndex].path, file);
                const allUploaded = group.references.every(ref => refMap.has(ref.path));
                return {...group, uploaded: allUploaded, uploadedPerRef: refMap};
            });
            return {...prev, mediaGroups: newMediaGroups, uploadError: null};
        });
        e.target.value = '';
    };

    const handleSingleUpload = (groupIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        setPendingImport(prev => {
            if (!prev) return prev;
            const newMediaGroups = prev.mediaGroups.map((group, idx) => (
                idx !== groupIndex ? group : {...group, uploaded: true, uploadedFile: file}
            ));
            return {...prev, mediaGroups: newMediaGroups, uploadError: null};
        });
        e.target.value = '';
    };

    const completePendingImport = async () => {
        if (importInFlightRef.current) return;
        if (!pendingImport) return;
        const {data, mediaGroups} = pendingImport;
        const missingGroups = mediaGroups.filter(g => !g.uploaded);
        if (missingGroups.length > 0) {
            const missingNames = missingGroups.map(g => g.filename).join(', ');
            setPendingImport({...pendingImport, uploadError: `Missing files: ${missingNames}`});
            return;
        }

        importInFlightRef.current = true;
        const createdMediaIds: string[] = [];
        const rollbackMediaIds = [...pendingStagedMediaIdsRef.current];
        setIsCompletingPendingImport(true);
        try {
            const mediaRefMap = new Map<string, string>();
            for (const group of mediaGroups) {
                if (group.isConflict) {
                    const refMap = group.uploadedPerRef;
                    if (!refMap) continue;
                    for (const ref of group.references) {
                        const uploadedFile = refMap.get(ref.path);
                        if (uploadedFile) {
                            const mediaId = await storeMedia(uploadedFile, ref.filename);
                            createdMediaIds.push(mediaId);
                            mediaRefMap.set(ref.path, createMediaRef(mediaId));
                        }
                    }
                } else if (group.uploadedFile) {
                    const mediaId = await storeMedia(group.uploadedFile, group.filename);
                    createdMediaIds.push(mediaId);
                    const idbRef = createMediaRef(mediaId);
                    for (const ref of group.references) {
                        mediaRefMap.set(ref.path, idbRef);
                    }
                }
            }

            const processedData = replaceMediaByPath(data, mediaRefMap);
            const result = performImport(processedData);
            setPendingImport(null);
            pendingStagedMediaIdsRef.current = [];
            setJsonInput('');
            setImportError(null);
            setImportSuccessMessage(result.message);
        } catch (e) {
            await Promise.all(
                [...rollbackMediaIds, ...createdMediaIds].map(id => deleteMedia(id).catch(() => undefined))
            );
            pendingStagedMediaIdsRef.current = [];
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            setPendingImport({...pendingImport, uploadError: `Import failed: ${errorMessage}`});
        } finally {
            importInFlightRef.current = false;
            setIsCompletingPendingImport(false);
        }
    };

    const cancelPendingImport = () => {
        if (isCompletingPendingImport) return;
        if (pendingStagedMediaIdsRef.current.length > 0) {
            void Promise.all(
                pendingStagedMediaIdsRef.current.map(id => deleteMedia(id).catch(() => undefined))
            );
        }
        pendingStagedMediaIdsRef.current = [];
        setPendingImport(null);
        setImportError(null);
    };

    const handleImport = () => {
        void runImportTask(async () => {
            try {
                const parsed: unknown = JSON.parse(jsonInput);
                const result = await detectAndImport(parsed);
                if (result.type === 'pending') {
                    setImportError(null);
                    return;
                }
                setJsonInput('');
                setImportError(null);
                setImportSuccessMessage(result.message);
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : 'Unknown error';
                setImportError(`Import failed: ${errorMessage}`);
            }
        });
    };

    const readAndImportFile = async (file: File) => {
        const lowerName = file.name.toLowerCase();
        pendingStagedMediaIdsRef.current = [];
        const isArchiveImport = lowerName.endsWith('.rqzl') || lowerName.endsWith('.zip');
        if (!(lowerName.endsWith('.json') || isArchiveImport)) {
            setImportError('Unsupported file type. Use .rqzl, .zip, or .json files.');
            return;
        }

        try {
            let parsed: unknown;
            const archiveCreatedIds: string[] = [];
            if (isArchiveImport) {
                const archive = await parseRqzlArchiveFile(file);
                parsed = archive.payload;
                if (!isImportableQuizPayload(parsed)) {
                    throw new Error('Invalid import format: expected a profile, subject export, subject, or subject array');
                }
                const archiveMediaRefMap = new Map<string, string>();
                try {
                    for (const entry of archive.mediaEntries) {
                        const typedBlob = entry.blob.type ? entry.blob : new Blob([entry.blob], {type: entry.mimeType});
                        const mediaId = await storeMedia(typedBlob, entry.filename);
                        archiveCreatedIds.push(mediaId);
                        const newMediaRef = createMediaRef(mediaId);
                        archiveMediaRefMap.set(createMediaRef(entry.id), newMediaRef);
                        if (entry.path) {
                            archiveMediaRefMap.set(entry.path, newMediaRef);
                        }
                    }
                    parsed = replaceMediaByPath(parsed, archiveMediaRefMap);
                    pendingStagedMediaIdsRef.current = [...archiveCreatedIds];
                } catch (archiveMediaError) {
                    await Promise.all(archiveCreatedIds.map(id => deleteMedia(id).catch(() => undefined)));
                    pendingStagedMediaIdsRef.current = [];
                    throw archiveMediaError;
                }
            } else {
                const content = await readFileAsText(file);
                parsed = JSON.parse(content);
            }

            let result: {type: 'profile' | 'subjects' | 'pending'; message: string};
            try {
                result = await detectAndImport(parsed);
            } catch (importError) {
                if (archiveCreatedIds.length > 0) {
                    await Promise.all(archiveCreatedIds.map(id => deleteMedia(id).catch(() => undefined)));
                }
                throw importError;
            }
            if (result.type === 'pending') {
                setImportError(null);
                return;
            }
            pendingStagedMediaIdsRef.current = [];

            setJsonInput('');
            setImportError(null);
            setImportSuccessMessage(result.message);
        } catch (e) {
            pendingStagedMediaIdsRef.current = [];
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            if (errorMessage.includes('read file')) {
                setImportError('Could not read that file. Try another file or paste JSON below.');
            } else {
                setImportError(`File import failed: ${errorMessage}`);
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, resetInput = true) => {
        const file = e.target.files?.[0];
        if (!file) return;
        void runImportTask(async () => {
            await readAndImportFile(file);
        });
        if (resetInput) {
            e.target.value = '';
        }
    };

    const handleImportDragEnter = (e: React.DragEvent) => {
        if (activeTab !== 'import') return;
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
        void runImportTask(async () => {
            await readAndImportFile(file);
        });
    };

    return {
        jsonInput,
        setJsonInput,
        importError,
        setImportError,
        importSuccessMessage,
        setImportSuccessMessage,
        pendingImport,
        imageInputRef,
        isImporting,
        isCompletingPendingImport,
        importDndActive: activeTab === 'import' && importDndActive,
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
    };
}
