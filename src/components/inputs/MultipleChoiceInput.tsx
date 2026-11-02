import React from 'react';
import type {MultipleChoiceQuestion} from '../../types';
import {clsx} from 'clsx';
import {motion} from 'framer-motion';
import {RichText} from '../RichText';
import {choiceStateClass} from './choiceStyles';

interface Props {
    question: MultipleChoiceQuestion;
    onAnswer: (answerIndex: number) => void;
    submittedAnswer?: number;
}

export const MultipleChoiceInput: React.FC<Props> = ({question, onAnswer, submittedAnswer}) => {
    const answered = submittedAnswer !== undefined;

    return (
        <div className="grid grid-cols-1 gap-3">
            {question.choices.map((choice, index) => {
                const isSelected = submittedAnswer === index;
                const isCorrect = index === question.answerIndex;

                return (
                    <motion.button
                        key={index}
                        type="button"
                        initial={{opacity: 0, y: 10}}
                        animate={{opacity: 1, y: 0}}
                        transition={{delay: index * 0.1}}
                        onClick={() => onAnswer(index)}
                        disabled={answered}
                        className={clsx(
                            'w-full text-left p-4 rounded-xl border-2 font-medium transition-all duration-200',
                            choiceStateClass(answered, isCorrect, isSelected),
                            answered && 'cursor-not-allowed'
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={clsx(
                                    'w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold border-2',
                                    answered && isCorrect
                                        ? 'border-green-500 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
                                        : answered && isSelected
                                          ? 'border-red-500 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
                                          : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                                )}
                            >
                                {String.fromCharCode(65 + index)}
                            </div>
                            <RichText inline>{choice}</RichText>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
};
