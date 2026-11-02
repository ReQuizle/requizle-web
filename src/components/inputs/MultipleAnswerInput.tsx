import React, {useState} from 'react';
import type {MultipleAnswerQuestion} from '../../types';
import {clsx} from 'clsx';
import {motion} from 'framer-motion';
import {CheckSquare, Square} from 'lucide-react';
import {RichText} from '../RichText';

interface Props {
    question: MultipleAnswerQuestion;
    onAnswer: (answer: number[]) => void;
    submittedAnswer?: number[];
}

export const MultipleAnswerInput: React.FC<Props> = ({question, onAnswer, submittedAnswer}) => {
    const [selectedIndices, setSelectedIndices] = useState<number[]>(submittedAnswer ?? []);
    const answered = submittedAnswer !== undefined;

    const toggleSelection = (index: number) => {
        setSelectedIndices((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
    };

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                {question.choices.map((choice, index) => {
                    const isSelected = selectedIndices.includes(index);
                    const isAnswer = question.answerIndices.includes(index);
                    const isCorrect = answered && isSelected && isAnswer;
                    const isMissed = answered && !isSelected && isAnswer;
                    const isWrong = answered && isSelected && !isAnswer;

                    let stateClass =
                        'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200';
                    if (isCorrect) {
                        stateClass =
                            'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400';
                    } else if (isMissed) {
                        stateClass =
                            'border-green-300 dark:border-green-600 border-dashed bg-green-50/50 dark:bg-green-900/10 text-green-600 dark:text-green-500';
                    } else if (isWrong) {
                        stateClass = 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400';
                    } else if (answered) {
                        stateClass =
                            'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400';
                    } else if (isSelected) {
                        stateClass =
                            'border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-300';
                    }

                    return (
                        <motion.button
                            key={index}
                            type="button"
                            whileHover={answered ? {} : {scale: 1.01}}
                            whileTap={answered ? {} : {scale: 0.99}}
                            onClick={() => toggleSelection(index)}
                            disabled={answered}
                            className={clsx(
                                'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 group',
                                stateClass,
                                !answered &&
                                    !isSelected &&
                                    'hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            )}
                        >
                            <div
                                className={clsx(
                                    'shrink-0 transition-colors',
                                    isCorrect
                                        ? 'text-green-600 dark:text-green-400'
                                        : isWrong
                                          ? 'text-red-700 dark:text-red-400'
                                          : isSelected
                                            ? 'text-indigo-600 dark:text-indigo-400'
                                            : 'text-slate-300 dark:text-slate-600 group-hover:text-indigo-300 dark:group-hover:text-indigo-500'
                                )}
                            >
                                {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                            </div>
                            <span className="text-lg font-medium">
                                <RichText inline>{choice}</RichText>
                            </span>
                        </motion.button>
                    );
                })}
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => onAnswer(selectedIndices)}
                    disabled={answered || selectedIndices.length === 0}
                    className="btn-primary"
                >
                    Submit answer
                </button>
            </div>
        </div>
    );
};
