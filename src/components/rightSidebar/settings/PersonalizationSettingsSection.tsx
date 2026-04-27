import React from 'react';
import {clsx} from 'clsx';
import {ThemeToggle} from '../../ThemeToggle';
import {SettingsSwitchRow} from './SettingsSwitchRow';
import {
    COLOR_PRESETS,
    getPresetLabel,
    type ColorThemeId,
    type PresetColorThemeId
} from '../../../utils/colorThemes';

type PersonalizationSettingsSectionProps = {
    animatedBackground: boolean;
    onSetAnimatedBackground: (value: boolean) => void;
    soundEnabled: boolean;
    onSetSoundEnabled: (value: boolean) => void;
    colorTheme: ColorThemeId;
    customAccentColor: string;
    onSetColorTheme: (value: ColorThemeId) => void;
    onSetCustomAccentColor: (value: string) => void;
};

export const PersonalizationSettingsSection: React.FC<PersonalizationSettingsSectionProps> = ({
    animatedBackground,
    onSetAnimatedBackground,
    soundEnabled,
    onSetSoundEnabled,
    colorTheme,
    customAccentColor,
    onSetColorTheme,
    onSetCustomAccentColor
}) => {
    const title =
        colorTheme === 'custom'
            ? 'Custom'
            : getPresetLabel(colorTheme as PresetColorThemeId);

    return (
        <div
            id="settings-panel-personalization"
            role="tabpanel"
            aria-labelledby="settings-tab-personalization"
            className="space-y-3"
        >
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Personalization</h3>
            <div className="flex items-center justify-between p-3 min-h-[52px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Theme</span>
                <ThemeToggle />
            </div>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Color theme</span>
                    <div className="text-right min-w-0">
                        <div className="text-xs text-slate-600 dark:text-slate-300 truncate">{title}</div>
                        {colorTheme === 'custom' && (
                            <div className="text-[10px] text-slate-500 font-mono truncate">{customAccentColor}</div>
                        )}
                    </div>
                </div>
                <div role="radiogroup" aria-label="Color theme" className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map(p => {
                        const isActive = colorTheme === p.id;
                        const swatch =
                            p.id === 'monochrome'
                                ? {background: 'linear-gradient(135deg, #171717 50%, #fafafa 50%)'}
                                : {backgroundColor: p.seed};
                        return (
                            <button
                                key={p.id}
                                type="button"
                                role="radio"
                                aria-checked={isActive}
                                aria-label={p.label}
                                title={p.label}
                                onClick={() => onSetColorTheme(p.id)}
                                className={clsx(
                                    'h-8 w-8 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500 dark:focus-visible:ring-offset-slate-800',
                                    isActive
                                        ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-400 dark:ring-offset-slate-800'
                                        : 'opacity-80 hover:opacity-100 hover:scale-110'
                                )}
                                style={swatch}
                            />
                        );
                    })}
                    <button
                        type="button"
                        role="radio"
                        aria-checked={colorTheme === 'custom'}
                        aria-label="Custom color"
                        title="Custom color"
                        onClick={() => onSetColorTheme('custom')}
                        className={clsx(
                            'h-8 w-8 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500 dark:focus-visible:ring-offset-slate-800 border border-dashed border-slate-300 dark:border-slate-500',
                            colorTheme === 'custom'
                                ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-400 dark:ring-offset-slate-800'
                                : 'opacity-80 hover:opacity-100'
                        )}
                        style={{backgroundColor: customAccentColor}}
                    />
                </div>
                {colorTheme === 'custom' && (
                    <label className="flex items-center justify-between gap-2 text-sm text-slate-700 dark:text-slate-200">
                        <span>Pick a color</span>
                        <input
                            type="color"
                            value={customAccentColor}
                            onChange={e => onSetCustomAccentColor(e.target.value)}
                            className="h-9 w-16 cursor-pointer rounded border border-slate-200 dark:border-slate-600 bg-transparent p-0"
                            aria-label="Custom accent color"
                        />
                    </label>
                )}
            </div>
            <SettingsSwitchRow
                title="Animated background"
                checked={animatedBackground}
                onChange={onSetAnimatedBackground}
            />
            <SettingsSwitchRow
                title="Sound effects"
                description="Feedback when you answer, skip, or continue"
                checked={soundEnabled}
                onChange={onSetSoundEnabled}
            />
        </div>
    );
};
