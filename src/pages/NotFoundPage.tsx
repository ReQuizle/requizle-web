import {Link} from 'react-router-dom';
import {Home, SquarePen} from 'lucide-react';
import {Logo} from '../components/Logo';

export function NotFoundPage() {
    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900 px-6 py-12">
            <div className="mx-auto w-full max-w-2xl">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 md:p-10 shadow-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <Logo size={40} />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                ReQuizle
                            </p>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
                                Page not found
                            </h1>
                        </div>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        The page you requested does not exist at this app path. It may have been moved,
                        deleted, or the URL might be incorrect.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link to="/" className="btn-primary inline-flex items-center gap-2">
                            <Home size={16} />
                            Go to study
                        </Link>
                        <Link
                            to="/edit"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <SquarePen size={16} />
                            Open content editor
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
