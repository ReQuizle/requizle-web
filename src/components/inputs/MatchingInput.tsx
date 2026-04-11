import React, {useState} from 'react';
import type {MatchingQuestion} from '../../types';
import {clsx} from 'clsx';
import {motion} from 'framer-motion';
import {RichText} from '../RichText';

interface Props {
    question: MatchingQuestion;
    onAnswer: (answer: Record<string, string>) => void;
    disabled: boolean;
    submittedAnswer: Record<string, string> | null;
}

// Fisher-Yates shuffle function
const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export const MatchingInput: React.FC<Props> = ({question, onAnswer, disabled, submittedAnswer}) => {
    // Initialize from submittedAnswer if already submitted (e.g., re-render)
    // submittedAnswer only transitions null -> value once per question lifecycle
    const [matches, setMatches] = useState<Record<string, string>>(submittedAnswer ?? {});
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

    // Shuffle the right side items for display (computed once on mount)
    // Parent uses key prop to force remount on question change, so this resets automatically
    const [shuffledRightItems] = useState<string[]>(() => {
        const rightItems = question.pairs.map(pair => pair.right);
        return shuffleArray(rightItems);
    });

    const handleLeftClick = (leftId: string) => {
        if (disabled) return;
        if (matches[leftId]) {
            // Unmatch
            const newMatches = {...matches};
            delete newMatches[leftId];
            setMatches(newMatches);
        } else {
            setSelectedLeft(leftId === selectedLeft ? null : leftId);
        }
    };

    const handleRightClick = (rightId: string) => {
        if (disabled || !selectedLeft) return;

        // Check if this right item is already matched
        const isAlreadyMatched = Object.values(matches).includes(rightId);
        if (isAlreadyMatched) return;

        setMatches(prev => ({
            ...prev,
            [selectedLeft]: rightId
        }));
        setSelectedLeft(null);
    };

    const isComplete = Object.keys(matches).length === question.pairs.length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Items</h3>
                    {question.pairs.map((pair) => {
                        const isMatched = !!matches[pair.left];
                        const isSelected = selectedLeft === pair.left;

                        return (
                            <motion.button
                                key={pair.left}
                                onClick={() => handleLeftClick(pair.left)}
                                disabled={disabled}
                                className={clsx(
                                    "w-full p-4 rounded-xl border-2 text-left text-sm font-medium transition-all",
                                    isMatched ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300" :
                                        isSelected ? "bg-indigo-600 dark:bg-indigo-600 border-indigo-600 dark:border-indigo-600 text-white shadow-lg scale-105" :
                                            "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-300"
                                )}
                            >
                                <RichText>{pair.left}</RichText>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Matches</h3>
                    {shuffledRightItems.map((rightItem) => {
                        // Find which left item is matched to this right item
                        const matchedLeft = Object.keys(matches).find(key => matches[key] === rightItem);
                        const isMatched = !!matchedLeft;

                        return (
                            <motion.button
                                key={rightItem}
                                onClick={() => handleRightClick(rightItem)}
                                disabled={disabled || (!!matchedLeft && disabled)} // Allow clicking if not disabled (logic handled in function)
                                className={clsx(
                                    "w-full p-4 rounded-xl border-2 text-left text-sm font-medium transition-all relative",
                                    isMatched ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300" :
                                        selectedLeft ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border-dashed hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 cursor-pointer" :
                                            "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 text-slate-400 dark:text-slate-600 cursor-default"
                                )}
                            >
                                <RichText>{rightItem}</RichText>
                                {matchedLeft && (
                                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white dark:border-slate-800 shadow-sm">
                                        {question.pairs.findIndex(p => p.left === matchedLeft) + 1}
                                    </div>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={() => onAnswer(matches)}
                    disabled={disabled || !isComplete}
                    className="btn btn-primary"
                >
                    Submit Matches
                </button>
            </div>
        </div>
    );
};
