import React from 'react';
import type {MultipleChoiceQuestion} from '../../types';
import {clsx} from 'clsx';
import {motion} from 'framer-motion';
import {RichText} from '../RichText';

interface Props {
    question: MultipleChoiceQuestion;
    onAnswer: (answerIndex: number) => void;
    disabled: boolean;
    submittedAnswer: number | null;
}

export const MultipleChoiceInput: React.FC<Props> = ({question, onAnswer, disabled, submittedAnswer}) => {
    return (
        <div className="grid grid-cols-1 gap-3">
            {question.choices.map((choice, index) => {
                const isSelected = submittedAnswer === index;
                const isCorrect = index === question.answerIndex;

                let stateClass = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200";

                if (submittedAnswer !== null) {
                    if (isCorrect) {
                        stateClass = "bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-500 text-green-700 dark:text-green-400 ring-1 ring-green-500";
                    } else if (isSelected) {
                        stateClass = "bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-500 text-red-700 dark:text-red-400 ring-1 ring-red-500";
                    } else {
                        stateClass = "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-600 opacity-50";
                    }
                }

                const isDisabled = disabled || submittedAnswer !== null;

                return (
                    <motion.button
                        key={index}
                        initial={{opacity: 0, y: 10}}
                        animate={{opacity: 1, y: 0}}
                        transition={{delay: index * 0.1}}
                        onClick={() => {
                            if (!isDisabled) {
                                onAnswer(index);
                            }
                        }}
                        disabled={isDisabled}
                        className={clsx(
                            "w-full text-left p-4 rounded-xl border-2 font-medium transition-all duration-200",
                            stateClass,
                            isDisabled && "cursor-not-allowed"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={clsx(
                                "w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold border-2",
                                submittedAnswer !== null && isCorrect ? "border-green-500 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400" :
                                    submittedAnswer !== null && isSelected ? "border-red-500 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400" :
                                        "border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400"
                            )}>
                                {String.fromCharCode(65 + index)}
                            </div>
                            <span><RichText inline>{choice}</RichText></span>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
};
