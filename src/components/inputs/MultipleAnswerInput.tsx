import React, {useState} from 'react';
import type {MultipleAnswerQuestion} from '../../types';
import {clsx} from 'clsx';
import {motion} from 'framer-motion';
import {CheckSquare, Square} from 'lucide-react';
import {RichText} from '../RichText';

interface Props {
    question: MultipleAnswerQuestion;
    onAnswer: (answer: number[]) => void;
    disabled: boolean;
    submittedAnswer: number[] | null;
}

export const MultipleAnswerInput: React.FC<Props> = ({question, onAnswer, disabled, submittedAnswer}) => {
    // Initialize from submittedAnswer if already submitted (e.g., re-render)
    // submittedAnswer only transitions null -> value once per question lifecycle
    const [selectedIndices, setSelectedIndices] = useState<number[]>(submittedAnswer ?? []);

    const toggleSelection = (index: number) => {
        if (disabled) return;

        setSelectedIndices(prev => {
            if (prev.includes(index)) {
                return prev.filter(i => i !== index);
            } else {
                return [...prev, index];
            }
        });
    };

    const handleSubmit = () => {
        onAnswer(selectedIndices);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                {question.choices.map((choice, index) => {
                    const isSelected = selectedIndices.includes(index);
                    const isCorrect = submittedAnswer && question.answerIndices.includes(index);
                    const isMissed = submittedAnswer && !isSelected && question.answerIndices.includes(index);
                    const isWrong = submittedAnswer && isSelected && !question.answerIndices.includes(index);

                    let borderColor = "border-slate-200 dark:border-slate-700";
                    let bgColor = "bg-white dark:bg-slate-800";
                    let textColor = "text-slate-700 dark:text-slate-200";

                    if (submittedAnswer) {
                        if (isCorrect) {
                            borderColor = "border-green-500 dark:border-green-500";
                            bgColor = "bg-green-50 dark:bg-green-900/20";
                            textColor = "text-green-800 dark:text-green-400";
                        } else if (isMissed) {
                            borderColor = "border-green-300 dark:border-green-600 border-dashed";
                            bgColor = "bg-green-50/50 dark:bg-green-900/10";
                            textColor = "text-green-600 dark:text-green-500";
                        } else if (isWrong) {
                            borderColor = "border-red-500 dark:border-red-500";
                            bgColor = "bg-red-50 dark:bg-red-900/20";
                            textColor = "text-red-800 dark:text-red-400";
                        } else {
                            borderColor = "border-slate-200 dark:border-slate-700";
                            bgColor = "bg-slate-50 dark:bg-slate-800/50 opacity-60";
                            textColor = "text-slate-400 dark:text-slate-600";
                        }
                    } else if (isSelected) {
                        borderColor = "border-indigo-600 dark:border-indigo-500";
                        bgColor = "bg-indigo-50 dark:bg-indigo-900/20";
                        textColor = "text-indigo-900 dark:text-indigo-300";
                    }

                    return (
                        <motion.button
                            key={index}
                            whileHover={!disabled ? {scale: 1.01} : {}}
                            whileTap={!disabled ? {scale: 0.99} : {}}
                            onClick={() => toggleSelection(index)}
                            disabled={disabled}
                            className={clsx(
                                "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 group",
                                borderColor,
                                bgColor,
                                textColor,
                                !disabled && !isSelected && "hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            )}
                        >
                            <div className={clsx(
                                "flex-shrink-0 transition-colors",
                                isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-300 dark:text-slate-600 group-hover:text-indigo-300 dark:group-hover:text-indigo-500",
                                submittedAnswer && isCorrect && "text-green-600 dark:text-green-400",
                                submittedAnswer && isWrong && "text-red-600 dark:text-red-400"
                            )}>
                                {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                            </div>
                            <span className="text-lg font-medium"><RichText>{choice}</RichText></span>
                        </motion.button>
                    );
                })}
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSubmit}
                    disabled={disabled || selectedIndices.length === 0}
                    className="btn btn-primary"
                >
                    Submit Answer
                </button>
            </div>
        </div>
    );
};
