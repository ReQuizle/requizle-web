import React, {useId, useRef} from 'react';
import type {Subject} from '../../types';
import {ModalShell} from '../AppModals';
import {useModalA11y} from '../modalA11y';

export type SubjectExportFormat = 'rqzl' | 'zip' | 'json';

export type SubjectExportOptions = {
    includeProgress: boolean;
    includeMedia: boolean;
    format: SubjectExportFormat;
};

type SubjectExportModalState = {
    subject: Subject;
    options: SubjectExportOptions;
};

type SubjectExportModalProps = {
    modalState: SubjectExportModalState | null;
    setOption: <K extends keyof SubjectExportOptions>(key: K, value: SubjectExportOptions[K]) => void;
    onClose: () => void;
    onExport: (subject: Subject, options: SubjectExportOptions) => void;
};

export const SubjectExportModal: React.FC<SubjectExportModalProps> = ({
    modalState,
    setOption,
    onClose,
    onExport
}) => {
    if (!modalState) return null;
    return (
        <SubjectExportModalMounted
            modalState={modalState}
            setOption={setOption}
            onClose={onClose}
            onExport={onExport}
        />
    );
};

const SubjectExportModalMounted: React.FC<{
    modalState: SubjectExportModalState;
    setOption: <K extends keyof SubjectExportOptions>(key: K, value: SubjectExportOptions[K]) => void;
    onClose: () => void;
    onExport: (subject: Subject, options: SubjectExportOptions) => void;
}> = ({modalState, setOption, onClose, onExport}) => {
    const jsonWithMedia = modalState.options.includeMedia && modalState.options.format === 'json';
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    useModalA11y(dialogRef, onClose);

    return (
        <ModalShell
            titleId={titleId}
            onClose={onClose}
            dialogRef={dialogRef}
            panelClassName="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4"
        >
                <h3 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">Export Subject</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Choose export options for <strong className="text-slate-900 dark:text-white">{modalState.subject.name}</strong>.
                </p>

                <div className="space-y-3">
                    {([
                        {key: 'includeProgress', label: 'Include progress'},
                        {key: 'includeMedia', label: 'Include media'}
                    ] as const).map(toggle => (
                        <label
                            key={toggle.key}
                            className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200"
                        >
                            <span>{toggle.label}</span>
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    className="toggle-switch-input"
                                    checked={modalState.options[toggle.key]}
                                    onChange={e => setOption(toggle.key, e.target.checked)}
                                />
                                <div className="toggle-switch-track"></div>
                            </div>
                        </label>
                    ))}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                            Export format
                        </label>
                        <select
                            value={modalState.options.format}
                            onChange={e => setOption('format', e.target.value as SubjectExportFormat)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                        >
                            <option value="rqzl">RQZL archive (.rqzl)</option>
                            <option value="zip">ZIP archive (.zip)</option>
                            <option value="json">JSON (.json)</option>
                        </select>
                    </div>
                </div>

                {jsonWithMedia && (
                    <div className="text-xs rounded-lg p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        JSON export cannot include media files. Turn off "Include media" or choose RQZL/ZIP.
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={jsonWithMedia}
                        onClick={() => onExport(modalState.subject, modalState.options)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        Export
                    </button>
                </div>
        </ModalShell>
    );
};
