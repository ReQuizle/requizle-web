import React, {useState} from 'react';
import type {WordBankQuestion} from '../../types';
import {clsx} from 'clsx';
import {motion} from 'framer-motion';
import {RichText} from '../RichText';

interface Props {
    question: WordBankQuestion;
    onAnswer: (answer: string[]) => void;
    submittedAnswer?: string[];
}

/** Returns the word bank without the words already placed in a blank. Repeated words are counted separately. */
function remainingWords(wordBank: string[], filledSlots: (string | null)[]): string[] {
    const remaining = [...wordBank];
    for (const word of filledSlots) {
        const idx = word === null ? -1 : remaining.indexOf(word);
        if (idx > -1) remaining.splice(idx, 1);
    }
    return remaining;
}

export const WordBankInput: React.FC<Props> = ({question, onAnswer, submittedAnswer}) => {
    const parts = question.sentence.split('_');
    const [filledSlots, setFilledSlots] = useState<(string | null)[]>(
        () => submittedAnswer ?? Array<string | null>(parts.length - 1).fill(null)
    );
    const availableWords = remainingWords(question.wordBank, filledSlots);
    const isComplete = filledSlots.every((s) => s !== null);
    const answered = submittedAnswer !== undefined;

    const setSlot = (index: number, word: string | null) => {
        setFilledSlots((prev) => prev.map((slot, i) => (i === index ? word : slot)));
    };

    const handleWordClick = (word: string) => {
        const emptyIndex = filledSlots.indexOf(null);
        if (emptyIndex !== -1) setSlot(emptyIndex, word);
    };

    return (
        <div className="space-y-8">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 leading-loose text-lg text-slate-800 dark:text-slate-200">
                {parts.map((part, i) => (
                    <React.Fragment key={i}>
                        <RichText inline>{part}</RichText>
                        {i < parts.length - 1 && (
                            <button
                                type="button"
                                onClick={() => setSlot(i, null)}
                                disabled={answered || !filledSlots[i]}
                                aria-label={
                                    filledSlots[i]
                                        ? `Remove ${filledSlots[i]} from blank ${i + 1}`
                                        : `Blank ${i + 1}, empty`
                                }
                                className={clsx(
                                    'inline-flex items-center justify-center min-w-[100px] h-10 mx-1 px-3 rounded-lg border-b-2 transition-all align-middle',
                                    filledSlots[i]
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-600 text-indigo-800 dark:text-indigo-300 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 hover:text-red-700 dark:hover:text-red-400'
                                        : 'bg-slate-200/60 dark:bg-slate-600/40 border-slate-400'
                                )}
                            >
                                {filledSlots[i] ? (
                                    <RichText inline>{filledSlots[i]}</RichText>
                                ) : (
                                    <span className="w-full h-0.5 bg-slate-400 rounded" />
                                )}
                            </button>
                        )}
                    </React.Fragment>
                ))}
            </div>

            <div>
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                    Word bank
                </h3>
                <div className="flex flex-wrap gap-2">
                    {availableWords.map((word, i) => (
                        <motion.button
                            key={`${word}-${i}`}
                            type="button"
                            layoutId={`word-${word}-${i}`}
                            onClick={() => handleWordClick(word)}
                            disabled={answered}
                            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg text-slate-700 dark:text-slate-200 font-medium hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:-translate-y-0.5 transition-all"
                        >
                            <RichText inline>{word}</RichText>
                        </motion.button>
                    ))}
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => onAnswer(filledSlots as string[])}
                    disabled={answered || !isComplete}
                    className="btn-primary"
                >
                    Submit answer
                </button>
            </div>
        </div>
    );
};
