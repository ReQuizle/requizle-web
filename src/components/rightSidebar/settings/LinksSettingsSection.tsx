import React from 'react';
import {BookOpen, ExternalLink, Github, MessageSquare} from 'lucide-react';

export const LinksSettingsSection: React.FC = () => (
    <div
        id="settings-panel-links"
        role="tabpanel"
        aria-labelledby="settings-tab-links"
        className="space-y-3"
    >
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Links &amp; help</h3>
        <div className="grid grid-cols-1 gap-2">
            <a
                href="https://requizle.github.io/requizle-wiki/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                        <BookOpen size={16} />
                    </div>
                    <div className="text-left">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 block">Documentation</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Guides and Tutorials</span>
                    </div>
                </div>
                <ExternalLink size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </a>

            <a
                href="https://github.com/ReQuizle/requizle-web"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors">
                        <Github size={16} />
                    </div>
                    <div className="text-left">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 block">Source Code</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">View on GitHub</span>
                    </div>
                </div>
                <ExternalLink size={14} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
            </a>

            <a
                href="https://github.com/ReQuizle/requizle-web/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 transition-colors">
                        <MessageSquare size={16} />
                    </div>
                    <div className="text-left">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 block">Report Issue</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Bug reports & feedback</span>
                    </div>
                </div>
                <ExternalLink size={14} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
            </a>
        </div>
    </div>
);
