import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft, SquarePen} from 'lucide-react';
import {ContentEditor} from '../components/ContentEditor';
import {ThemeToggle} from '../components/ThemeToggle';

export const EditorPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
            <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 shrink-0"
                    >
                        <ArrowLeft size={18} />
                        Back to study
                    </Link>
                    <div className="flex-1 min-w-0 flex items-center justify-center gap-2 sm:justify-start sm:pl-2">
                        <SquarePen size={20} className="text-slate-500 dark:text-slate-400 shrink-0" />
                        <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">
                            Edit content
                        </h1>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:px-6 sm:py-8">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-4 sm:p-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                        Create and edit subjects, topics, and questions in your active profile. Subject and topic
                        changes apply right away; question changes apply when you select Save question.
                    </p>
                    <ContentEditor />
                </div>
            </main>
        </div>
    );
};
