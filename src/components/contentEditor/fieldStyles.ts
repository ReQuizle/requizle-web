// Tailwind classes shared by the content editor's fields, so they look the same everywhere.

/** A full-width text input, textarea, or select. */
export const FIELD_CLASS =
    'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm';

/** A compact input in a row of choices or pairs. */
export const COMPACT_FIELD_CLASS =
    'flex-1 min-w-0 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm';

/** A small select, such as the question type. */
export const SMALL_SELECT_CLASS =
    'text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900';

/** The label above a field. */
export const FIELD_LABEL_CLASS = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1';

/** The heading of an editor section, such as Subject or Topics. */
export const SECTION_LABEL_CLASS =
    'text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1';

/** The icon button that removes a choice or pair. */
export const REMOVE_ROW_BUTTON_CLASS =
    'shrink-0 p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:pointer-events-none';

/** A text button that adds a choice or pair. */
export const ADD_ROW_BUTTON_CLASS = 'text-xs text-indigo-600 dark:text-indigo-400';

/** A button that deletes a subject, topic, or question. */
export const DELETE_BUTTON_CLASS =
    'inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20';
