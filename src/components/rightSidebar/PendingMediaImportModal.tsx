import React, {useId, useRef} from 'react';
import {AlertCircle, Check, ImageIcon, Upload, X} from 'lucide-react';
import {clsx} from 'clsx';
import type {MediaGroup} from '../../utils/importValidation';
import {useModalA11y} from '../modalA11y';
import {ModalShell} from '../AppModals';

type PendingImportState = {
    data: unknown;
    mediaGroups: MediaGroup[];
    uploadError: string | null;
};

type PendingMediaImportModalProps = {
    pendingImport: PendingImportState | null;
    isCompleting: boolean;
    imageInputRef: React.RefObject<HTMLInputElement | null>;
    onCancel: () => void;
    onConflictUpload: (groupIndex: number, refIndex: number, e: React.ChangeEvent<HTMLInputElement>) => void;
    onSingleUpload: (groupIndex: number, e: React.ChangeEvent<HTMLInputElement>) => void;
    onBulkUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCompleteImport: () => void;
};

type PendingMediaImportModalMountedProps = Omit<PendingMediaImportModalProps, 'pendingImport'> & {
    pendingImport: PendingImportState;
};

export const PendingMediaImportModal: React.FC<PendingMediaImportModalProps> = ({
    pendingImport,
    isCompleting,
    imageInputRef,
    onCancel,
    onConflictUpload,
    onSingleUpload,
    onBulkUpload,
    onCompleteImport
}) => {
    if (!pendingImport) return null;
    return (
        <PendingMediaImportModalMounted
            pendingImport={pendingImport}
            isCompleting={isCompleting}
            imageInputRef={imageInputRef}
            onCancel={onCancel}
            onConflictUpload={onConflictUpload}
            onSingleUpload={onSingleUpload}
            onBulkUpload={onBulkUpload}
            onCompleteImport={onCompleteImport}
        />
    );
};

const PendingMediaImportModalMounted: React.FC<PendingMediaImportModalMountedProps> = ({
    pendingImport,
    isCompleting,
    imageInputRef,
    onCancel,
    onConflictUpload,
    onSingleUpload,
    onBulkUpload,
    onCompleteImport
}) => {
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    useModalA11y(dialogRef, onCancel);

    return (
        <ModalShell
            titleId={titleId}
            onClose={onCancel}
            dialogRef={dialogRef}
            panelClassName="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4"
            closeOnOverlayMouseDown={!isCompleting}
        >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <ImageIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">Upload Media</h3>
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
                                <div
                                    className={clsx(
                                        'flex items-center justify-between p-2 rounded-lg text-sm',
                                        group.uploaded
                                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                            : hasConflict
                                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                    )}
                                >
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

                                {hasConflict ? (
                                    <div className="ml-4 space-y-1">
                                        {group.references.map((ref, refIndex) => {
                                            const isRefUploaded = refMap?.has(ref.path);
                                            return (
                                                <div
                                                    key={ref.path}
                                                    className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-700/50"
                                                >
                                                    <span className="text-slate-600 dark:text-slate-400 truncate">
                                                        {ref.subjectName}{' -> '}{ref.topicName}
                                                    </span>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {isRefUploaded ? (
                                                            <Check className="w-3 h-3 text-green-500" />
                                                        ) : (
                                                            <>
                                                                <input
                                                                    type="file"
                                                                    accept="image/*,video/*"
                                                                    onChange={e => onConflictUpload(groupIndex, refIndex, e)}
                                                                    disabled={isCompleting}
                                                                    className="hidden"
                                                                    id={`conflict-${groupIndex}-${refIndex}`}
                                                                />
                                                                <label
                                                                    htmlFor={`conflict-${groupIndex}-${refIndex}`}
                                                                    className={clsx(
                                                                        'px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900',
                                                                        isCompleting && 'opacity-50 cursor-not-allowed pointer-events-none'
                                                                    )}
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
                                    <div className="ml-4 flex items-center justify-between text-xs p-1.5 rounded bg-slate-50 dark:bg-slate-700/50">
                                        <span className="text-slate-500 dark:text-slate-400 truncate">
                                            {group.references.map(r => `${r.subjectName} -> ${r.topicName}`).join(', ')}
                                        </span>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {group.uploaded ? (
                                                <Check className="w-3 h-3 text-green-500" />
                                            ) : (
                                                <>
                                                    <input
                                                        type="file"
                                                        accept="image/*,video/*"
                                                        onChange={e => onSingleUpload(groupIndex, e)}
                                                        disabled={isCompleting}
                                                        className="hidden"
                                                        id={`single-${groupIndex}`}
                                                    />
                                                    <label
                                                        htmlFor={`single-${groupIndex}`}
                                                        className={clsx(
                                                            'px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900',
                                                            isCompleting && 'opacity-50 cursor-not-allowed pointer-events-none'
                                                        )}
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

                <div className="text-xs text-slate-500 dark:text-slate-400">
                    {isCompleting
                        ? 'Importing...'
                        : `${pendingImport.mediaGroups.filter(g => g.uploaded).length} of ${pendingImport.mediaGroups.length} files ready`}
                </div>

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
                    disabled={isCompleting}
                    onChange={onBulkUpload}
                    className="hidden"
                />

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onCancel}
                        disabled={isCompleting}
                        className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    {pendingImport.mediaGroups.some(g => !g.isConflict && !g.uploaded) && (
                        <button
                            onClick={() => imageInputRef.current?.click()}
                            disabled={isCompleting}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Upload Files
                        </button>
                    )}
                </div>

                {pendingImport.mediaGroups.every(g => g.uploaded) && (
                    <button
                        onClick={onCompleteImport}
                        disabled={isCompleting}
                        className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <Check className="w-4 h-4" />
                        {isCompleting ? 'Importing...' : 'Complete Import'}
                    </button>
                )}
        </ModalShell>
    );
};
