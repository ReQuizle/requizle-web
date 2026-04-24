import React from 'react';
import {ThemeToggle} from '../../ThemeToggle';
import {SettingsSwitchRow} from './SettingsSwitchRow';

type AppearanceSettingsSectionProps = {
    animatedBackground: boolean;
    onSetAnimatedBackground: (value: boolean) => void;
};

export const AppearanceSettingsSection: React.FC<AppearanceSettingsSectionProps> = ({
    animatedBackground,
    onSetAnimatedBackground
}) => (
    <div
        id="settings-panel-appearance"
        role="tabpanel"
        aria-labelledby="settings-tab-appearance"
        className="space-y-3"
    >
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Appearance</h3>
        <div className="flex items-center justify-between p-3 min-h-[52px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Theme</span>
            <ThemeToggle />
        </div>
        <SettingsSwitchRow
            title="Animated background"
            checked={animatedBackground}
            onChange={onSetAnimatedBackground}
        />
    </div>
);
