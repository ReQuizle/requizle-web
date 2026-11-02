import React from 'react';
import {Moon, Sun} from 'lucide-react';
import {useTheme} from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
    const {theme, toggleTheme} = useTheme();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
        >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
    );
};
