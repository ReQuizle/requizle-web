import React, {useId, useState} from 'react';
import type {KeywordsQuestion} from '../../types';
import {Send} from 'lucide-react';

interface Props {
    question: KeywordsQuestion;
    onAnswer: (answer: string) => void;
    disabled: boolean;
    submittedAnswer: string | null;
}

export const KeywordsInput: React.FC<Props> = ({onAnswer, disabled, submittedAnswer}) => {
    const [input, setInput] = useState('');
    const inputId = useId();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !disabled) {
            onAnswer(input.trim());
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full">
            <div className="relative">
                <label htmlFor={inputId} className="sr-only">Your answer</label>
                <input
                    id={inputId}
                    type="text"
                    value={submittedAnswer || input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={disabled}
                    placeholder="Type your answer here..."
                    className="w-full p-4 pr-14 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-lg disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:disabled:text-slate-500"
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={disabled || !input.trim()}
                    aria-label="Submit answer"
                    className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg flex items-center justify-center transition-colors"
                >
                    <Send size={20} />
                </button>
            </div>
        </form>
    );
};

