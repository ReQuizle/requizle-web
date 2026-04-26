import React, {useId, useRef} from 'react';
import {ModalShell} from './AppModals';
import {useModalA11y} from './modalA11y';

export type ExportFormat = 'rqzl' | 'zip' | 'json';

export type ExportOptions = {
    includeProgress: boolean;
    includeMedia: boolean;
    format: ExportFormat;
};

type ExportOptionsModalProps = {
    open: boolean;
    title: string;
    targetLabel: string;
    options: ExportOptions;
    setOption: <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => void;
    onClose: () => void;
    onExport: () => void;
};

export const ExportOptionsModal: React.FC<ExportOptionsModalProps> = (props) => {
    if (!props.open) return null;
    return <ExportOptionsModalMounted {...props} />;
};

const ExportOptionsModalMounted: React.FC<ExportOptionsModalProps> = ({
    title,
    targetLabel,
    options,
    setOption,
    onClose,
    onExport
}) => {
    const jsonWithMedia = options.includeMedia && options.format === 'json';
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
            <h3 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
                Choose export options for <strong className="text-slate-900 dark:text-white">{targetLabel}</strong>.
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
                                checked={options[toggle.key]}
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
                        value={options.format}
                        onChange={e => setOption('format', e.target.value as ExportFormat)}
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
                    className="btn-secondary flex-1 text-sm"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={jsonWithMedia}
                    onClick={onExport}
                    className="btn-primary flex-1 text-sm"
                >
                    Export
                </button>
            </div>
        </ModalShell>
    );
};
