/**
 * Classes for a single-pick choice button. Before an answer every choice looks the same; after it
 * the correct choice turns green, a wrong pick turns red, and the rest fade out.
 */
export function choiceStateClass(answered: boolean, isCorrect: boolean, isSelected: boolean): string {
    if (!answered) {
        return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200';
    }
    if (isCorrect) {
        return 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400 ring-1 ring-green-500';
    }
    if (isSelected) {
        return 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400 ring-1 ring-red-500';
    }
    return 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400';
}
