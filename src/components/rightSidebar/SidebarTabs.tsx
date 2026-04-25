import React from 'react';
import {clsx} from 'clsx';

export type RightSidebarTab = 'mastery' | 'import' | 'settings';

type SidebarTabsProps = {
    activeTab: RightSidebarTab;
    onChange: (tab: RightSidebarTab) => void;
};

export const SidebarTabs: React.FC<SidebarTabsProps> = ({activeTab, onChange}) => {
    const tabs: RightSidebarTab[] = ['mastery', 'import', 'settings'];

    return (
        <div
            className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg"
            role="tablist"
            aria-label="Right sidebar sections"
        >
            {tabs.map((tab, index) => (
                <button
                    key={tab}
                    id={`right-sidebar-tab-${tab}`}
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls={`right-sidebar-panel-${tab}`}
                    tabIndex={activeTab === tab ? 0 : -1}
                    type="button"
                    onClick={() => onChange(tab)}
                    onKeyDown={e => {
                        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                        e.preventDefault();
                        const direction = e.key === 'ArrowRight' ? 1 : -1;
                        const nextTab = tabs[(index + direction + tabs.length) % tabs.length];
                        onChange(nextTab);
                        requestAnimationFrame(() => {
                            document.getElementById(`right-sidebar-tab-${nextTab}`)?.focus();
                        });
                    }}
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
};
