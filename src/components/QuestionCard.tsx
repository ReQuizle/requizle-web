import React, {useEffect, useRef, useState} from 'react';
import {motion} from 'framer-motion';
import confetti from 'canvas-confetti';
import {ArrowRight, SkipForward, AlertCircle, CheckCircle2} from 'lucide-react';
import type {Question} from '../types';
import {useQuizStore, type AnswerResult} from '../store/useQuizStore';
import {QUESTION_TYPES} from '../utils/contentEditor';
import {useResolvedMediaUrl} from '../utils/useResolvedMediaUrl';
import {playQuizSound} from '../utils/soundEffects';
import {MultipleAnswerInput} from './inputs/MultipleAnswerInput';
import {MultipleChoiceInput} from './inputs/MultipleChoiceInput';
import {TrueFalseInput} from './inputs/TrueFalseInput';
import {KeywordsInput} from './inputs/KeywordsInput';
import {MatchingInput} from './inputs/MatchingInput';
import {WordBankInput} from './inputs/WordBankInput';
import {RichText} from './RichText';

const CONFETTI_COOLDOWN_MS = 700;
let lastConfettiAt = 0;

function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function shouldPlayConfetti(): boolean {
    if (prefersReducedMotion()) {
        return false;
    }
    const now = Date.now();
    if (now - lastConfettiAt < CONFETTI_COOLDOWN_MS) {
        return false;
    }
    lastConfettiAt = now;
    return true;
}

/** Confetti on a canvas of its own, which screen readers skip because it is only decoration. */
function celebrate(): void {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'fixed inset-0 w-full h-full pointer-events-none z-[100]';
    document.body.appendChild(canvas);
    const done = confetti.create(canvas, {resize: true})({
        particleCount: 65,
        spread: 60,
        origin: {y: 0.6},
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#10b981']
    });
    if (done) {
        void done.then(() => canvas.remove());
    } else {
        canvas.remove();
    }
}

function findScrollableParent(element: HTMLElement): HTMLElement | null {
    let node: HTMLElement | null = element.parentElement;
    while (node) {
        const {overflowY} = window.getComputedStyle(node);
        if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
            return node;
        }
        node = node.parentElement;
    }
    return null;
}

function QuestionMedia({media}: {media: string}) {
    const {resolvedUrl, isVideo, loading, error} = useResolvedMediaUrl(media);

    if (loading) {
        return (
            <div className="mb-4 flex items-center justify-center h-32 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <span className="text-slate-500 dark:text-slate-400 text-sm">Loading media...</span>
            </div>
        );
    }
    if (error || !resolvedUrl) {
        return (
            <div className="mb-4 flex items-center justify-center h-24 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <span className="text-red-500 dark:text-red-400 text-sm">Failed to load media</span>
            </div>
        );
    }
    if (isVideo) {
        return (
            <video
                src={resolvedUrl}
                controls
                className="mb-4 max-w-full max-h-80 rounded-lg border border-slate-200 dark:border-slate-700 mx-auto"
                title="Question video"
            />
        );
    }
    return (
        <img
            src={resolvedUrl}
            alt="Question illustration"
            className="mb-4 max-w-full max-h-64 rounded-lg border border-slate-200 dark:border-slate-700 object-contain mx-auto"
        />
    );
}

const AnswerPill: React.FC<{children: React.ReactNode}> = ({children}) => (
    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded font-semibold">
        {children}
    </span>
);

function CorrectAnswer({question}: {question: Question}) {
    switch (question.type) {
        case 'multiple_choice':
            return (
                <div className="flex mt-1">
                    <AnswerPill>
                        <RichText inline>{question.choices[question.answerIndex]}</RichText>
                    </AnswerPill>
                </div>
            );
        case 'multiple_answer':
            return (
                <div className="flex flex-wrap gap-2 mt-1">
                    {question.answerIndices.map((i) => (
                        <AnswerPill key={i}>
                            <RichText inline>{question.choices[i]}</RichText>
                        </AnswerPill>
                    ))}
                </div>
            );
        case 'true_false':
            return (
                <div className="flex mt-1">
                    <AnswerPill>{question.answer ? 'True' : 'False'}</AnswerPill>
                </div>
            );
        case 'keywords': {
            const keywords = Array.isArray(question.answer) ? question.answer : [question.answer];
            return (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                    {keywords.map((keyword, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && <span className="text-slate-500 dark:text-slate-400">or</span>}
                            <AnswerPill>
                                <RichText inline>{keyword}</RichText>
                            </AnswerPill>
                        </React.Fragment>
                    ))}
                </div>
            );
        }
        case 'matching':
            return (
                <div className="flex flex-col gap-2 mt-1">
                    {question.pairs.map((pair, i) => (
                        <div key={i} className="flex items-center gap-2 flex-wrap">
                            <AnswerPill>
                                <RichText inline>{pair.left}</RichText>
                            </AnswerPill>
                            <ArrowRight size={14} className="text-slate-500 dark:text-slate-400" />
                            <AnswerPill>
                                <RichText inline>{pair.right}</RichText>
                            </AnswerPill>
                        </div>
                    ))}
                </div>
            );
        case 'word_bank':
            return (
                <p>
                    {question.sentence.split('_').map((part, i) => (
                        <React.Fragment key={i}>
                            {i > 0 && (
                                <span className="px-1.5 py-0.5 mx-0.5 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded font-bold">
                                    <RichText inline>{question.answers[i - 1]}</RichText>
                                </span>
                            )}
                            <RichText inline>{part}</RichText>
                        </React.Fragment>
                    ))}
                </p>
            );
    }
}

interface Props {
    question: Question;
    onFeedbackVisibilityChange?: (visible: boolean) => void;
}

/** One question and, once it is answered, whether the answer was right. Remount it for each new question. */
export const QuestionCard: React.FC<Props> = ({question, onFeedbackVisibilityChange}) => {
    const {submitAnswer, skipQuestion, nextQuestion} = useQuizStore();
    const soundEnabled = useQuizStore((s) => s.settings.soundEnabled);
    const [submitted, setSubmitted] = useState<{answer: unknown; result: AnswerResult} | null>(null);
    const continueButtonRef = useRef<HTMLButtonElement>(null);
    const hasSubmitted = submitted !== null;
    const result = submitted?.result;
    const typeLabel = QUESTION_TYPES.find((type) => type.value === question.type)?.label;

    useEffect(() => {
        onFeedbackVisibilityChange?.(hasSubmitted);
        return () => onFeedbackVisibilityChange?.(false);
    }, [hasSubmitted, onFeedbackVisibilityChange]);

    const handleAnswer = (answer: unknown) => {
        const res = submitAnswer(answer);
        setSubmitted({answer, result: res});

        playQuizSound(res.correct ? 'correct' : 'incorrect', soundEnabled);

        if (res.correct && shouldPlayConfetti()) {
            celebrate();
        }
    };

    const handleSkip = () => {
        playQuizSound('skip', soundEnabled);
        skipQuestion();
    };

    const showFeedback = () => {
        const button = continueButtonRef.current;
        if (!button) return;
        button.focus({preventScroll: true});
        const scrollParent = findScrollableParent(button);
        scrollParent?.scrollTo({
            top: scrollParent.scrollHeight - scrollParent.clientHeight,
            behavior: prefersReducedMotion() ? 'auto' : 'smooth'
        });
    };

    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.3}}
            className="w-full max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50">
                <div className="flex justify-between items-start gap-4 mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                        {typeLabel}
                    </span>
                    {!hasSubmitted && (
                        <button
                            type="button"
                            onClick={handleSkip}
                            aria-label="Skip current question"
                            className="text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 text-sm flex items-center gap-1 transition-colors"
                        >
                            Skip <SkipForward size={14} />
                        </button>
                    )}
                </div>

                {question.media && <QuestionMedia media={question.media} />}

                <div
                    role="heading"
                    aria-level={2}
                    className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed"
                >
                    <RichText>{question.prompt}</RichText>
                </div>
            </div>

            <div className="p-6 md:p-8 bg-white dark:bg-slate-800">
                {question.type === 'multiple_choice' && (
                    <MultipleChoiceInput
                        question={question}
                        onAnswer={handleAnswer}
                        submittedAnswer={submitted?.answer as number | undefined}
                    />
                )}
                {question.type === 'multiple_answer' && (
                    <MultipleAnswerInput
                        question={question}
                        onAnswer={handleAnswer}
                        submittedAnswer={submitted?.answer as number[] | undefined}
                    />
                )}
                {question.type === 'true_false' && (
                    <TrueFalseInput
                        question={question}
                        onAnswer={handleAnswer}
                        submittedAnswer={submitted?.answer as boolean | undefined}
                    />
                )}
                {question.type === 'keywords' && (
                    <KeywordsInput onAnswer={handleAnswer} submittedAnswer={submitted?.answer as string | undefined} />
                )}
                {question.type === 'matching' && (
                    <MatchingInput
                        question={question}
                        onAnswer={handleAnswer}
                        submittedAnswer={submitted?.answer as Record<string, string> | undefined}
                    />
                )}
                {question.type === 'word_bank' && (
                    <WordBankInput
                        question={question}
                        onAnswer={handleAnswer}
                        submittedAnswer={submitted?.answer as string[] | undefined}
                    />
                )}
            </div>

            {result && (
                <motion.div
                    initial={{height: 0, opacity: 0}}
                    animate={{height: 'auto', opacity: 1}}
                    onAnimationComplete={showFeedback}
                    className={`border-t ${result.correct ? 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900/30' : 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30'}`}
                >
                    <div className="p-6">
                        <div className="flex items-start gap-4">
                            <div
                                className={`p-2 rounded-full ${result.correct ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'}`}
                            >
                                {result.correct ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                            </div>
                            <div className="flex-1">
                                <h3
                                    className={`text-lg font-bold ${result.correct ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}
                                >
                                    {result.correct ? 'Correct!' : 'Not quite right'}
                                </h3>
                                {result.explanation && (
                                    <div className="mt-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                                        <RichText>{result.explanation}</RichText>
                                    </div>
                                )}
                                {!result.correct && (
                                    <div className="mt-3 p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-red-100 dark:border-red-900/30 text-sm">
                                        <span className="font-semibold text-red-800 dark:text-red-300 block mb-1">
                                            Correct answer:
                                        </span>
                                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                                            <CorrectAnswer question={question} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                ref={continueButtonRef}
                                onClick={() => {
                                    playQuizSound('continue', soundEnabled);
                                    nextQuestion();
                                }}
                                className={`${result.correct ? 'btn-success' : 'btn-danger'} flex items-center gap-2`}
                            >
                                Continue <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};
