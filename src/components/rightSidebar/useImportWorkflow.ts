import {useRef, useState} from 'react';
import {
    validateSubjects,
    isSubjectExportV1,
    validateProfileImport,
    isImportableQuizPayload,
    extractMediaReferencesWithContext,
    getLocalMediaRefs,
    groupMediaByFilename,
    replaceMediaByPath,
    type MediaGroup
} from '../../utils/importValidation';
import {storeMedia, createMediaRef, deleteMedia} from '../../utils/mediaStorage';
import {parseRqzlArchiveFile} from '../../utils/rqzlArchive';
import type {Profile, Subject, SubjectExportV1} from '../../types';
import {plural} from '../../utils/plural';

/** The `accept` value for file inputs that import quizzes. */
export const IMPORT_FILE_TYPES = '.rqzl,.zip,.json,application/json,application/zip';

const INVALID_FORMAT_MESSAGE = 'Invalid import format: expected a profile, subject export, subject, or subject array';

/** An import waiting for the user to upload the local media files it refers to */
export type PendingImport = {
    data: unknown;
    mediaGroups: MediaGroup[];
    uploadError: string | null;
};

function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : 'Unknown error';
}

/** Deletes media stored for an import that did not finish. Failures are ignored. */
async function discardMedia(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => deleteMedia(id).catch(() => undefined)));
}

type UseImportWorkflowParams = {
    profiles: Record<string, Profile>;
    subjects: Subject[];
    importProfile: (profile: Profile) => void;
    importSubjects: (subjects: Subject[]) => void;
    importSubjectExport: (bundle: SubjectExportV1) => void;
};

export function useImportWorkflow({
    profiles,
    subjects,
    importProfile,
    importSubjects,
    importSubjectExport
}: UseImportWorkflowParams) {
    const [jsonInput, setJsonInput] = useState('');
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
    const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isCompletingPendingImport, setIsCompletingPendingImport] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const pendingStagedMediaIdsRef = useRef<string[]>([]);
    const importInFlightRef = useRef(false);

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

    /** Imports the payload and returns a message saying what happened. */
    const performImport = (parsed: unknown): string => {
        if (isSubjectExportV1(parsed)) {
            importSubjectExport(parsed);
            const {name} = parsed.subject;
            const hasProgress = Object.values(parsed.progress ?? {}).some((topic) => Object.keys(topic).length > 0);
            return hasProgress ? `Imported "${name}" with progress.` : `Imported "${name}".`;
        }

        let profile: Profile | null = null;
        try {
            profile = validateProfileImport(parsed);
        } catch {
            // Not a profile, so it is imported as subjects below
        }
        if (profile) {
            const exists = profile.id in profiles;
            importProfile(profile);
            return exists
                ? `Merged "${profile.name}" into the existing profile.`
                : `Imported profile "${profile.name}".`;
        }

        const validatedSubjects = validateSubjects(parsed);
        const existingSubjectIds = subjects.map((s) => s.id);
        const mergedCount = validatedSubjects.filter((s) => existingSubjectIds.includes(s.id)).length;
        const newCount = validatedSubjects.length - mergedCount;
        importSubjects(validatedSubjects);

        if (mergedCount > 0 && newCount > 0) {
            return `Merged ${plural(mergedCount, 'existing subject')} and added ${plural(newCount, 'new subject')}.`;
        }
        if (mergedCount > 0) {
            return `Merged ${plural(mergedCount, 'subject')} with existing data.`;
        }
        return `Added ${plural(newCount, 'new subject')}.`;
    };

    /** Imports the payload, or returns null when the user has to upload its media files first. */
    const detectAndImport = (parsed: unknown): string | null => {
        if (!isImportableQuizPayload(parsed)) {
            throw new Error(INVALID_FORMAT_MESSAGE);
        }

        const localRefs = getLocalMediaRefs(extractMediaReferencesWithContext(parsed));
        if (localRefs.length > 0) {
            setPendingImport({data: parsed, mediaGroups: groupMediaByFilename(localRefs), uploadError: null});
            return null;
        }

        return performImport(parsed);
    };

    const showImportResult = (message: string) => {
        setJsonInput('');
        setImportError(null);
        setImportSuccessMessage(message);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!pendingImport || !e.target.files) return;
        const files = Array.from(e.target.files);
        e.target.value = '';

        const neededFilenames = new Set(
            pendingImport.mediaGroups.filter((g) => !g.isConflict && !g.uploaded).map((g) => g.filename)
        );
        const uploads = new Map(
            files.filter((file) => neededFilenames.has(file.name)).map((file) => [file.name, file])
        );
        const skipped = files.filter((file) => !neededFilenames.has(file.name)).map((file) => file.name);

        if (uploads.size === 0) {
            setPendingImport({
                ...pendingImport,
                uploadError:
                    skipped.length > 0
                        ? `None of the chosen files are on the list, or they need uploading one at a time: ${skipped.join(', ')}`
                        : 'No matching files selected'
            });
            return;
        }

        setPendingImport((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                mediaGroups: prev.mediaGroups.map((group) => {
                    const uploadedFile = group.isConflict ? undefined : uploads.get(group.filename);
                    return uploadedFile ? {...group, uploaded: true, uploadedFile} : group;
                }),
                uploadError: skipped.length > 0 ? `Skipped ${plural(skipped.length, 'file')} not on the list` : null
            };
        });
    };

    const handleConflictUpload = (groupIndex: number, refIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingImport((prev) => {
            if (!prev) return prev;
            const newMediaGroups = prev.mediaGroups.map((group, idx) => {
                if (idx !== groupIndex) return group;
                const refMap = new Map(group.uploadedPerRef || []);
                refMap.set(group.references[refIndex].path, file);
                const allUploaded = group.references.every((ref) => refMap.has(ref.path));
                return {...group, uploaded: allUploaded, uploadedPerRef: refMap};
            });
            return {...prev, mediaGroups: newMediaGroups, uploadError: null};
        });
        e.target.value = '';
    };

    const handleSingleUpload = (groupIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPendingImport((prev) => {
            if (!prev) return prev;
            const newMediaGroups = prev.mediaGroups.map((group, idx) =>
                idx !== groupIndex ? group : {...group, uploaded: true, uploadedFile: file}
            );
            return {...prev, mediaGroups: newMediaGroups, uploadError: null};
        });
        e.target.value = '';
    };

    const completePendingImport = async () => {
        if (importInFlightRef.current) return;
        if (!pendingImport) return;
        const {data, mediaGroups} = pendingImport;
        const missingGroups = mediaGroups.filter((g) => !g.uploaded);
        if (missingGroups.length > 0) {
            const missingNames = missingGroups.map((g) => g.filename).join(', ');
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

            const message = performImport(replaceMediaByPath(data, mediaRefMap));
            setPendingImport(null);
            pendingStagedMediaIdsRef.current = [];
            showImportResult(message);
        } catch (e) {
            await discardMedia([...rollbackMediaIds, ...createdMediaIds]);
            pendingStagedMediaIdsRef.current = [];
            setPendingImport({...pendingImport, uploadError: `Import failed: ${errorMessage(e)}`});
        } finally {
            importInFlightRef.current = false;
            setIsCompletingPendingImport(false);
        }
    };

    const cancelPendingImport = () => {
        if (isCompletingPendingImport) return;
        void discardMedia(pendingStagedMediaIdsRef.current);
        pendingStagedMediaIdsRef.current = [];
        setPendingImport(null);
        setImportError(null);
    };

    const handleImport = () => {
        void runImportTask(async () => {
            try {
                const message = detectAndImport(JSON.parse(jsonInput));
                if (message) {
                    showImportResult(message);
                } else {
                    setImportError(null);
                }
            } catch (e) {
                setImportError(`Import failed: ${errorMessage(e)}`);
            }
        });
    };

    const readAndImportFile = async (file: File) => {
        const lowerName = file.name.toLowerCase();
        const isArchive = lowerName.endsWith('.rqzl') || lowerName.endsWith('.zip');
        if (!isArchive && !lowerName.endsWith('.json')) {
            setImportError('Unsupported file type. Use .rqzl, .zip, or .json files.');
            return;
        }

        pendingStagedMediaIdsRef.current = [];
        const storedMediaIds: string[] = [];
        try {
            let parsed: unknown;
            if (isArchive) {
                const archive = await parseRqzlArchiveFile(file);
                if (!isImportableQuizPayload(archive.payload)) {
                    throw new Error(INVALID_FORMAT_MESSAGE);
                }
                const mediaRefMap = new Map<string, string>();
                for (const entry of archive.mediaEntries) {
                    const mediaId = await storeMedia(entry.blob, entry.filename);
                    storedMediaIds.push(mediaId);
                    const mediaRef = createMediaRef(mediaId);
                    mediaRefMap.set(createMediaRef(entry.id), mediaRef);
                    if (entry.path) {
                        mediaRefMap.set(entry.path, mediaRef);
                    }
                }
                parsed = replaceMediaByPath(archive.payload, mediaRefMap);
            } else {
                let content: string;
                try {
                    content = await file.text();
                } catch {
                    setImportError('Could not read that file. Try choosing it again, or use another file.');
                    return;
                }
                parsed = JSON.parse(content);
            }

            const message = detectAndImport(parsed);
            if (message) {
                showImportResult(message);
            } else {
                // Kept until the user finishes or cancels uploading the media the archive left out
                pendingStagedMediaIdsRef.current = storedMediaIds;
                setImportError(null);
            }
        } catch (e) {
            await discardMedia(storedMediaIds);
            setImportError(`File import failed: ${errorMessage(e)}`);
        }
    };

    const importFile = (file: File) => {
        void runImportTask(() => readAndImportFile(file));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        importFile(file);
        e.target.value = '';
    };

    return {
        jsonInput,
        setJsonInput,
        importError,
        importSuccessMessage,
        setImportSuccessMessage,
        pendingImport,
        imageInputRef,
        isImporting,
        isCompletingPendingImport,
        handleImport,
        handleFileUpload,
        importFile,
        handleImageUpload,
        handleConflictUpload,
        handleSingleUpload,
        completePendingImport,
        cancelPendingImport
    };
}
