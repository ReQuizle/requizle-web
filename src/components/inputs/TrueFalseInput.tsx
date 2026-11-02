import React from 'react';
import type {TrueFalseQuestion} from '../../types';
import {clsx} from 'clsx';
import {motion} from 'framer-motion';
import {Check, X} from 'lucide-react';
import {choiceStateClass} from './choiceStyles';

const OPTIONS = [
    {value: true, label: 'True', Icon: Check},
    {value: false, label: 'False', Icon: X}
] as const;

interface Props {
    question: TrueFalseQuestion;
    onAnswer: (answer: boolean) => void;
    submittedAnswer?: boolean;
}

export const TrueFalseInput: React.FC<Props> = ({question, onAnswer, submittedAnswer}) => {
    const answered = submittedAnswer !== undefined;

    return (
        <div className="grid grid-cols-2 gap-4">
            {OPTIONS.map(({value, label, Icon}) => {
                const isSelected = submittedAnswer === value;
                const isCorrect = value === question.answer;

                return (
                    <motion.button
                        key={label}
                        type="button"
                        whileHover={answered ? {} : {scale: 1.02}}
                        whileTap={answered ? {} : {scale: 0.98}}
                        onClick={() => onAnswer(value)}
                        disabled={answered}
                        className={clsx(
                            'flex flex-col items-center justify-center p-8 rounded-xl border-2 font-bold text-lg transition-all duration-200 gap-3',
                            choiceStateClass(answered, isCorrect, isSelected),
                            answered && 'cursor-not-allowed'
                        )}
                    >
                        <div
                            className={clsx(
                                'p-3 rounded-full',
                                answered && isCorrect
                                    ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
                                    : answered && isSelected
                                      ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
                                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            )}
                        >
                            <Icon size={32} />
                        </div>
                        {label}
                    </motion.button>
                );
            })}
        </div>
    );
};
