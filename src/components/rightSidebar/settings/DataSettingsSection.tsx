import React from 'react';
import {AlertCircle, Trash2} from 'lucide-react';

type CacheClearResult = {removed: number; message: string} | null;

type DataSettingsSectionProps = {
    currentSubjectName: string | null;
    confirmResetSubjectProgress: boolean;
    clearingCache: boolean;
    cacheClearResult: CacheClearResult;
    onResetSubjectProgress: () => void;
    onClearCache: () => void;
    onFactoryReset: () => void;
};

export const DataSettingsSection: React.FC<DataSettingsSectionProps> = ({
    currentSubjectName,
    confirmResetSubjectProgress,
    clearingCache,
    cacheClearResult,
    onResetSubjectProgress,
    onClearCache,
    onFactoryReset
}) => (
    <div
        id="settings-panel-data"
        role="tabpanel"
        aria-labelledby="settings-tab-data"
        className="space-y-3"
    >
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Data Management</h3>

        {currentSubjectName && (
            <button
                type="button"
                onClick={onResetSubjectProgress}
                className="w-full flex items-center justify-center gap-2 p-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-sm font-medium"
                title={confirmResetSubjectProgress ? `Reset progress for ${currentSubjectName}` : undefined}
            >
                <Trash2 size={16} />
                Reset Subject Progress
            </button>
        )}

        <button
            onClick={onClearCache}
            disabled={clearingCache}
            className="w-full flex items-center justify-center gap-2 p-3 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
        >
            <Trash2 size={16} />
            {clearingCache ? 'Clearing...' : 'Clear Cache'}
        </button>

        {cacheClearResult && (
            <div
                className={`p-2 rounded-lg text-xs text-center ${
                    cacheClearResult.removed > 0
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
            >
                {cacheClearResult.message}
            </div>
        )}

        <button
            type="button"
            onClick={onFactoryReset}
            className="w-full flex items-center justify-center gap-2 p-3 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium"
        >
            <AlertCircle size={16} />
            Wipe All Data (Factory Reset)
        </button>
    </div>
);
