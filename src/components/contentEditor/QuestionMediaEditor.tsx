import React, {useId, useState} from 'react';
import {clsx} from 'clsx';
import {Trash2, Upload} from 'lucide-react';
import {createMediaRef, storeMedia} from '../../utils/mediaStorage';
import {useResolvedMediaUrl} from '../../utils/useResolvedMediaUrl';
import {FIELD_CLASS} from './fieldStyles';

interface QuestionMediaEditorProps {
    media: string | undefined;
    onMediaChange: (next: string | undefined) => void;
}

/**
 * Preview, upload, or link the image or video shown with a question.
 */
export function QuestionMediaEditor({media, onMediaChange}: QuestionMediaEditorProps) {
    const urlId = useId();
    const {resolvedUrl, isVideo, loading: mediaLoading, error: mediaError} = useResolvedMediaUrl(media);
    const [uploadBusy, setUploadBusy] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            setUploadError('Choose an image or video file.');
            return;
        }
        setUploadBusy(true);
        setUploadError(null);
        try {
            const id = await storeMedia(file, file.name);
            onMediaChange(createMediaRef(id));
        } catch {
            setUploadError('Could not store this file.');
        } finally {
            setUploadBusy(false);
        }
    };

    return (
        <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">Media (optional)</span>

            {media && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 p-2 min-h-[120px] flex items-center justify-center">
                    {mediaLoading && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">Loading preview...</span>
                    )}
                    {!mediaLoading && mediaError && (
                        <span className="text-xs text-red-500 dark:text-red-400">Could not load this media.</span>
                    )}
                    {!mediaLoading &&
                        !mediaError &&
                        resolvedUrl &&
                        (isVideo ? (
                            <video
                                src={resolvedUrl}
                                controls
                                className="max-w-full max-h-48 rounded-md border border-slate-200 dark:border-slate-600"
                                title="Question media preview"
                            />
                        ) : (
                            <img
                                src={resolvedUrl}
                                alt="Question media preview"
                                className="max-w-full max-h-48 rounded-md border border-slate-200 dark:border-slate-600 object-contain"
                            />
                        ))}
                </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
                <label
                    className={clsx(
                        'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500',
                        uploadBusy
                            ? 'opacity-50 pointer-events-none border-slate-200 dark:border-slate-600'
                            : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    )}
                >
                    <Upload size={14} />
                    {uploadBusy ? 'Uploading...' : 'Upload file'}
                    <input
                        type="file"
                        accept="image/*,video/*"
                        className="sr-only"
                        disabled={uploadBusy}
                        onChange={handleFile}
                    />
                </label>
                <button
                    type="button"
                    disabled={!media}
                    onClick={() => onMediaChange(undefined)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:pointer-events-none"
                >
                    <Trash2 size={14} />
                    Remove media
                </button>
            </div>
            {uploadError && <p className="text-xs text-red-500 dark:text-red-400">{uploadError}</p>}

            <div>
                <label htmlFor={urlId} className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    URL, path, or <code className="text-[10px]">idb:...</code> ref (paste to replace upload)
                </label>
                <input
                    id={urlId}
                    type="text"
                    value={media ?? ''}
                    onChange={(event) => onMediaChange(event.target.value || undefined)}
                    placeholder="https://... or /media/photo.jpg"
                    className={FIELD_CLASS}
                />
            </div>
        </div>
    );
}
