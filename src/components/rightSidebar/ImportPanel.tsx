import React, {useRef, useState} from 'react';
import {clsx} from 'clsx';
import {AlertCircle, ExternalLink, Upload} from 'lucide-react';
import {IMPORT_FILE_TYPES, type useImportWorkflow} from './useImportWorkflow';

type ImportPanelProps = Pick<
    ReturnType<typeof useImportWorkflow>,
    'jsonInput' | 'setJsonInput' | 'importError' | 'isImporting' | 'handleImport' | 'handleFileUpload' | 'importFile'
>;

/** Import a quiz file by choosing it, dropping it, or pasting its JSON. */
export const ImportPanel: React.FC<ImportPanelProps> = ({
    jsonInput,
    setJsonInput,
    importError,
    isImporting,
    handleImport,
    handleFileUpload,
    importFile
}) => {
    const [dragActive, setDragActive] = useState(false);
    // dragenter and dragleave also fire for the drop zone's children
    const dragDepth = useRef(0);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        dragDepth.current += 1;
        setDragActive(true);
    };

    const handleDragLeave = () => {
        dragDepth.current -= 1;
        if (dragDepth.current === 0) setDragActive(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragActive(false);
        const file = e.dataTransfer.files[0];
        if (file) importFile(file);
    };

    return (
        <>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <div className="flex items-start gap-2">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
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
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={clsx(
                        'rounded-xl border-2 border-dashed transition-colors outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-900',
                        dragActive
                            ? 'border-indigo-500 bg-indigo-50/90 dark:bg-indigo-900/35'
                            : 'border-slate-300 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/40'
                    )}
                >
                    <input
                        id="import-file-input"
                        type="file"
                        accept={IMPORT_FILE_TYPES}
                        onChange={handleFileUpload}
                        disabled={isImporting}
                        className="sr-only"
                    />
                    <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
                        <div
                            className={clsx(
                                'p-3 rounded-full transition-colors',
                                dragActive
                                    ? 'bg-indigo-200/80 dark:bg-indigo-800/50 text-indigo-700 dark:text-indigo-200'
                                    : 'bg-slate-200/80 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300'
                            )}
                        >
                            <Upload size={22} strokeWidth={2} />
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
                    </div>
                </div>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-50 dark:bg-slate-900 px-2 text-slate-500 dark:text-slate-400">
                        Or paste JSON
                    </span>
                </div>
            </div>

            <div className="space-y-2">
                <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='[{"id": "math", ...}]'
                    aria-label="Paste JSON to import"
                    className="w-full h-40 p-3 text-xs font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
                <button
                    type="button"
                    onClick={handleImport}
                    disabled={!jsonInput.trim() || isImporting}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                >
                    <Upload size={16} />
                    {isImporting ? 'Importing...' : 'Apply JSON'}
                </button>
            </div>

            {importError && (
                <div
                    role="alert"
                    className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs rounded-lg break-words"
                >
                    {importError}
                </div>
            )}
        </>
    );
};
