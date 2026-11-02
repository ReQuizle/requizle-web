import React from 'react';
import {ToggleSwitch} from '../../ToggleSwitch';

type SettingsSwitchRowProps = {
    title: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
};

export const SettingsSwitchRow: React.FC<SettingsSwitchRowProps> = ({title, description, checked, onChange}) => (
    <label className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer gap-3">
        <span className="min-w-0">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 block">{title}</span>
            {description && <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
        </span>
        <ToggleSwitch checked={checked} onChange={onChange} />
    </label>
);
