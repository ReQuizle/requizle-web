import React, {useState} from 'react';
import type {MatchingQuestion} from '../../types';
import {clsx} from 'clsx';
import {RichText} from '../RichText';
import {shuffleArray} from '../../utils/array';

interface Props {
    question: MatchingQuestion;
    onAnswer: (answer: Record<string, string>) => void;
    submittedAnswer?: Record<string, string>;
}

export const MatchingInput: React.FC<Props> = ({question, onAnswer, submittedAnswer}) => {
    const [matches, setMatches] = useState<Record<string, string>>(submittedAnswer ?? {});
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
    const [shuffledRightItems] = useState(() => shuffleArray(question.pairs.map((pair) => pair.right)));
    const answered = submittedAnswer !== undefined;

    const handleLeftClick = (leftId: string) => {
        if (matches[leftId]) {
            setMatches((prev) => {
                const next = {...prev};
                delete next[leftId];
                return next;
            });
        } else {
            setSelectedLeft(leftId === selectedLeft ? null : leftId);
        }
    };

    const handleRightClick = (rightId: string) => {
        if (!selectedLeft || Object.values(matches).includes(rightId)) return;
        setMatches((prev) => ({...prev, [selectedLeft]: rightId}));
        setSelectedLeft(null);
    };

    const isComplete = Object.keys(matches).length === question.pairs.length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Items
                    </h3>
                    {question.pairs.map((pair) => {
                        const isMatched = !!matches[pair.left];
                        const isSelected = selectedLeft === pair.left;

                        return (
                            <button
                                key={pair.left}
                                type="button"
                                onClick={() => handleLeftClick(pair.left)}
                                disabled={answered}
                                className={clsx(
                                    'w-full p-4 rounded-xl border-2 text-left text-sm font-medium transition-all',
                                    isMatched
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                                        : isSelected
                                          ? 'bg-indigo-600 border-indigo-600 text-on-accent shadow-lg scale-105'
                                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-300'
                                )}
                            >
                                <RichText inline>{pair.left}</RichText>
                            </button>
                        );
                    })}
                </div>

                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Matches
                    </h3>
                    {shuffledRightItems.map((rightItem) => {
                        const matchedLeft = Object.keys(matches).find((key) => matches[key] === rightItem);
                        const isMatched = !!matchedLeft;

                        return (
                            <button
                                key={rightItem}
                                type="button"
                                onClick={() => handleRightClick(rightItem)}
                                disabled={answered}
                                className={clsx(
                                    'w-full p-4 rounded-xl border-2 text-left text-sm font-medium transition-all relative',
                                    isMatched
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                                        : selectedLeft
                                          ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border-dashed hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 cursor-pointer'
                                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 cursor-default'
                                )}
                            >
                                <RichText inline>{rightItem}</RichText>
                                {matchedLeft && (
                                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white dark:border-slate-800 shadow-sm">
                                        {question.pairs.findIndex((p) => p.left === matchedLeft) + 1}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => onAnswer(matches)}
                    disabled={answered || !isComplete}
                    className="btn-primary"
                >
                    Submit matches
                </button>
            </div>
        </div>
    );
};
