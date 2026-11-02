import React from 'react';
import {BookOpen, ExternalLink, Github, MessageSquare} from 'lucide-react';

const LINKS = [
    {
        href: 'https://requizle.github.io/requizle-wiki/',
        title: 'Documentation',
        description: 'Guides and tutorials',
        Icon: BookOpen,
        cardClass: 'hover:border-indigo-300 dark:hover:border-indigo-600',
        iconClass:
            'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40',
        arrowClass: 'group-hover:text-indigo-600'
    },
    {
        href: 'https://github.com/ReQuizle/requizle-web',
        title: 'Source code',
        description: 'View on GitHub',
        Icon: Github,
        cardClass: 'hover:border-slate-400 dark:hover:border-slate-500',
        iconClass:
            'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-600',
        arrowClass: 'group-hover:text-slate-600 dark:group-hover:text-slate-200'
    },
    {
        href: 'https://github.com/ReQuizle/requizle-web/issues',
        title: 'Report issue',
        description: 'Bug reports & feedback',
        Icon: MessageSquare,
        cardClass: 'hover:border-amber-300 dark:hover:border-amber-600',
        iconClass:
            'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40',
        arrowClass: 'group-hover:text-amber-500'
    }
];

export const LinksSettingsSection: React.FC = () => (
    <div id="settings-panel-links" role="tabpanel" aria-labelledby="settings-tab-links" className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Links & help
        </h2>
        <div className="space-y-2">
            {LINKS.map(({href, title, description, Icon, cardClass, iconClass, arrowClass}) => (
                <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors group ${cardClass}`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${iconClass}`}>
                            <Icon size={16} />
                        </div>
                        <div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 block">
                                {title}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span>
                        </div>
                    </div>
                    <ExternalLink
                        size={14}
                        className={`text-slate-500 dark:text-slate-400 transition-colors ${arrowClass}`}
                    />
                </a>
            ))}
        </div>
    </div>
);
