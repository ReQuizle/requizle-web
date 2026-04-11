import React, {useState} from 'react';
import type {WordBankQuestion} from '../../types';
import {clsx} from 'clsx';
import {motion} from 'framer-motion';
import {RichText} from '../RichText';

interface Props {
    question: WordBankQuestion;
    onAnswer: (answer: string[]) => void;
    disabled: boolean;
    submittedAnswer: string[] | null;
}

// Helper to compute available words after slots are filled
const computeAvailableWords = (wordBank: string[], filledSlots: (string | null)[]): string[] => {
    const used = filledSlots.filter(Boolean) as string[];
    const remaining = [...wordBank];
    used.forEach(word => {
        const idx = remaining.indexOf(word);
        if (idx > -1) remaining.splice(idx, 1);
    });
    return remaining;
};

export const WordBankInput: React.FC<Props> = ({question, onAnswer, disabled, submittedAnswer}) => {
    // Initialize from submittedAnswer if already submitted (e.g., re-render)
    // submittedAnswer only transitions null -> value once per question lifecycle
    const initialSlots = submittedAnswer ?? new Array(question.sentence.split('_').length - 1).fill(null);
    const [filledSlots, setFilledSlots] = useState<(string | null)[]>(initialSlots);
    const [availableWords, setAvailableWords] = useState<string[]>(
        () => computeAvailableWords(question.wordBank, initialSlots)
    );

    const handleWordClick = (word: string) => {
        if (disabled) return;

        // Find first empty slot
        const emptyIndex = filledSlots.indexOf(null);
        if (emptyIndex === -1) return;

        const newSlots = [...filledSlots];
        newSlots[emptyIndex] = word;
        setFilledSlots(newSlots);

        setAvailableWords(prev => {
            const newWords = [...prev];
            const idx = newWords.indexOf(word);
            if (idx > -1) newWords.splice(idx, 1);
            return newWords;
        });
    };

    const handleSlotClick = (index: number) => {
        if (disabled) return;

        const word = filledSlots[index];
        if (!word) return;

        const newSlots = [...filledSlots];
        newSlots[index] = null;
        setFilledSlots(newSlots);

        setAvailableWords(prev => [...prev, word]);
    };

    const isComplete = filledSlots.every(s => s !== null);

    // Split sentence by underscores to render slots
    const parts = question.sentence.split('_');

    return (
        <div className="space-y-8">
            {/* Sentence Area */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 leading-loose text-lg text-slate-800 dark:text-slate-200">
                {parts.map((part, i) => (
                    <React.Fragment key={i}>
                        <span><RichText>{part}</RichText></span>
                        {i < parts.length - 1 && (
                            <button
                                onClick={() => handleSlotClick(i)}
                                disabled={disabled || !filledSlots[i]}
                                className={clsx(
                                    "inline-flex items-center justify-center min-w-[100px] h-10 mx-1 px-3 rounded-lg border-b-2 transition-all align-middle",
                                    filledSlots[i]
                                        ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-600 text-indigo-800 dark:text-indigo-300 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400 group"
                                        : "bg-slate-200/60 dark:bg-slate-600/40 border-slate-400 dark:border-slate-400"
                                )}
                            >
                                {filledSlots[i] ? <RichText>{filledSlots[i]}</RichText> : <span className="w-full h-0.5 bg-slate-400 dark:bg-slate-400 rounded"></span>}
                            </button>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Word Bank */}
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Word Bank</h3>
                <div className="flex flex-wrap gap-2">
                    {availableWords.map((word, i) => (
                        <motion.button
                            key={`${word}-${i}`}
                            layoutId={`word-${word}-${i}`}
                            onClick={() => handleWordClick(word)}
                            disabled={disabled}
                            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg text-slate-700 dark:text-slate-200 font-medium hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:-translate-y-0.5 transition-all"
                        >
                            <RichText>{word}</RichText>
                        </motion.button>
                    ))}
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={() => onAnswer(filledSlots as string[])}
                    disabled={disabled || !isComplete}
                    className="btn btn-primary"
                >
                    Submit Answer
                </button>
            </div>
        </div>
    );
};
