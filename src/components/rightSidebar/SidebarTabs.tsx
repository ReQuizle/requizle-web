import React from 'react';
import {clsx} from 'clsx';

export type RightSidebarTab = 'mastery' | 'import' | 'settings';

type SidebarTabsProps = {
    activeTab: RightSidebarTab;
    onChange: (tab: RightSidebarTab) => void;
};

export const SidebarTabs: React.FC<SidebarTabsProps> = ({activeTab, onChange}) => (
    <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
        {(['mastery', 'import', 'settings'] as const).map(tab => (
            <button
                key={tab}
                type="button"
                onClick={() => onChange(tab)}
                className={clsx(
                    'flex-1 py-1.5 text-sm font-medium rounded-md transition-all',
                    activeTab === tab
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                )}
            >
                {tab[0].toUpperCase() + tab.slice(1)}
            </button>
        ))}
    </div>
);
