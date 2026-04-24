import React from 'react';

type SettingsSwitchRowProps = {
    title: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
};

export const SettingsSwitchRow: React.FC<SettingsSwitchRowProps> = ({title, description, checked, onChange}) => (
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
