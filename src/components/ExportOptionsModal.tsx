import React, {useId, useState} from 'react';
import {ModalShell} from './AppModals';
import {ToggleSwitch} from './ToggleSwitch';
import {DEFAULT_EXPORT_OPTIONS, type ExportFormat, type ExportOptions} from '../utils/exportFiles';

type ExportOptionsModalProps = {
    open: boolean;
    title: string;
    targetLabel: string;
    onClose: () => void;
    onExport: (options: ExportOptions) => void;
};

/** Choose what an export includes and its file format. The options start from the defaults each time it opens. */
export const ExportOptionsModal: React.FC<ExportOptionsModalProps> = (props) => {
    if (!props.open) return null;
    return <ExportOptionsModalMounted {...props} />;
};

const ExportOptionsModalMounted: React.FC<ExportOptionsModalProps> = ({title, targetLabel, onClose, onExport}) => {
    const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
    const setOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) =>
        setOptions((current) => ({...current, [key]: value}));
    const jsonWithMedia = options.includeMedia && options.format === 'json';
    const formatId = useId();

    return (
        <ModalShell title={title} onClose={onClose} width="max-w-md">
            <p className="text-sm text-slate-600 dark:text-slate-400">
                Choose export options for <strong className="text-slate-900 dark:text-white">{targetLabel}</strong>.
            </p>

            <div className="space-y-3">
                {(
                    [
                        {key: 'includeProgress', label: 'Include progress'},
                        {key: 'includeMedia', label: 'Include media'}
                    ] as const
                ).map((toggle) => (
                    <label
                        key={toggle.key}
                        className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200"
                    >
                        <span>{toggle.label}</span>
                        <ToggleSwitch
                            checked={options[toggle.key]}
                            onChange={(checked) => setOption(toggle.key, checked)}
                        />
                    </label>
                ))}

                <div>
                    <label
                        htmlFor={formatId}
                        className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                    >
                        Export format
                    </label>
                    <select
                        id={formatId}
                        value={options.format}
                        onChange={(e) => setOption('format', e.target.value as ExportFormat)}
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
                <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={jsonWithMedia}
                    onClick={() => onExport(options)}
                    className="btn-primary flex-1 text-sm"
                >
                    Export
                </button>
            </div>
        </ModalShell>
    );
};
