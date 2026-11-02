import React from 'react';
import {clsx} from 'clsx';
import {Database, Link2, Palette, SlidersHorizontal, Users} from 'lucide-react';

export type SettingsSectionId = 'profiles' | 'personalization' | 'behavior' | 'data' | 'links';

const SETTINGS_SECTIONS: {id: SettingsSectionId; label: string; icon: typeof Users}[] = [
    {id: 'profiles', label: 'Profiles', icon: Users},
    {id: 'personalization', label: 'Personalization', icon: Palette},
    {id: 'behavior', label: 'Behavior', icon: SlidersHorizontal},
    {id: 'data', label: 'Data', icon: Database},
    {id: 'links', label: 'Links & help', icon: Link2}
];

type SettingsNavProps = {
    selected: SettingsSectionId;
    onSelect: (section: SettingsSectionId) => void;
};

/** The settings categories as a vertical tab list; the arrow keys move between them. */
export const SettingsNav: React.FC<SettingsNavProps> = ({selected, onSelect}) => {
    const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const next = SETTINGS_SECTIONS[(index + step + SETTINGS_SECTIONS.length) % SETTINGS_SECTIONS.length];
        onSelect(next.id);
        requestAnimationFrame(() => {
            document.getElementById(`settings-tab-${next.id}`)?.focus();
        });
    };

    return (
        <div className="sticky top-0 z-10 -mx-2 px-2 pt-0 pb-2 -mt-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-0.5">
                Settings
            </p>
            <div
                className="flex flex-col gap-1.5"
                role="tablist"
                aria-label="Settings categories"
                aria-orientation="vertical"
            >
                {SETTINGS_SECTIONS.map(({id, label, icon: Icon}, index) => {
                    const isSelected = selected === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            id={`settings-tab-${id}`}
                            aria-selected={isSelected}
                            aria-controls={`settings-panel-${id}`}
                            tabIndex={isSelected ? 0 : -1}
                            onKeyDown={(event) => handleKeyDown(event, index)}
                            onClick={() => onSelect(id)}
                            className={clsx(
                                'w-full flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors border',
                                isSelected
                                    ? 'bg-indigo-600 text-on-accent border-indigo-600 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-slate-900 dark:hover:text-white'
                            )}
                        >
                            <Icon size={18} className="shrink-0 opacity-90" />
                            <span className="min-w-0">{label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
