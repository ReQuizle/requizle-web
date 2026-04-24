import React, {useState, useEffect} from 'react';
import type {Question} from '../types';
import {useQuizStore} from '../store/useQuizStore';
import {
    createMediaObjectUrl,
    extractMediaId,
    getMedia,
    isIndexedDBMedia,
    revokeMediaObjectUrl
} from '../utils/mediaStorage';
import {isVideoMediaUrl} from '../utils/mediaFormat';
import {MultipleAnswerInput} from './inputs/MultipleAnswerInput';
import {MultipleChoiceInput} from './inputs/MultipleChoiceInput';
import {TrueFalseInput} from './inputs/TrueFalseInput';
import {KeywordsInput} from './inputs/KeywordsInput';
import {MatchingInput} from './inputs/MatchingInput';
import {WordBankInput} from './inputs/WordBankInput';
import {RichText} from './RichText';
import {motion, AnimatePresence} from 'framer-motion';
import confetti from 'canvas-confetti';
import {ArrowRight, SkipForward, AlertCircle, CheckCircle2} from 'lucide-react';

interface Props {
    question: Question;
}

type AnswerType = number | number[] | boolean | string | Record<string, string> | string[];

export const QuestionCard: React.FC<Props> = ({question}) => {
    const {submitAnswer, skipQuestion} = useQuizStore();
    const [submittedAnswer, setSubmittedAnswer] = useState<AnswerType | null>(null);
    const [result, setResult] = useState<{correct: boolean; explanation?: string} | null>(null);

    const needsAsyncLoad = question.media && isIndexedDBMedia(question.media);
    const [resolvedMediaUrl, setResolvedMediaUrl] = useState<string | null>(
        question.media && !needsAsyncLoad ? question.media : null
    );
    const [mediaLoading, setMediaLoading] = useState(needsAsyncLoad ?? false);
    const [mediaError, setMediaError] = useState(false);

    useEffect(() => {
        if (!question.media || !isIndexedDBMedia(question.media)) {
            return;
        }

        const mediaId = extractMediaId(question.media);
        const maxRetries = 3;
        const retryDelay = 500;
        const retryTimers = new Set<ReturnType<typeof setTimeout>>();
        let cancelled = false;

        const scheduleRetry = (retryCount: number) => {
            const timer = setTimeout(() => {
                retryTimers.delete(timer);
                attemptLoad(retryCount);
            }, retryDelay);
            retryTimers.add(timer);
        };

        const attemptLoad = (retryCount: number) => {
            getMedia(mediaId).then(entry => {
                if (cancelled) return;
                if (entry) {
                    setResolvedMediaUrl(createMediaObjectUrl(entry));
                    setMediaLoading(false);
                } else if (retryCount < maxRetries) {
                    scheduleRetry(retryCount + 1);
                } else {
                    setResolvedMediaUrl(null);
                    setMediaError(true);
                    setMediaLoading(false);
                }
            }).catch(() => {
                if (cancelled) return;
                if (retryCount < maxRetries) {
                    scheduleRetry(retryCount + 1);
                } else {
                    setResolvedMediaUrl(null);
                    setMediaError(true);
                    setMediaLoading(false);
                }
            });
        };

        attemptLoad(0);

        return () => {
            cancelled = true;
            retryTimers.forEach(timer => clearTimeout(timer));
            retryTimers.clear();
        };
    }, [question.media]);

    useEffect(() => {
        return () => {
            if (resolvedMediaUrl?.startsWith('blob:')) {
                revokeMediaObjectUrl(resolvedMediaUrl);
            }
        };
    }, [resolvedMediaUrl]);

    const handleAnswer = (answer: AnswerType) => {
        setSubmittedAnswer(answer);
        const res = submitAnswer(answer);
        setResult(res);

        if (res.correct) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: {y: 0.6},
                colors: ['#6366f1', '#8b5cf6', '#ec4899', '#10b981']
            });
        }
    };

    const handleSkip = () => {
        skipQuestion();
    };

    return (
        <div className="w-full max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
                <motion.div
                    key={question.id}
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -20}}
                    transition={{duration: 0.3}}
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                >
                    {/* Header / Prompt */}
                    <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-900/50">
                        <div className="flex justify-between items-start gap-4 mb-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                                {question.type.replace('_', ' ').toUpperCase()}
                            </span>
                            {!submittedAnswer && (
                                <button
                                    onClick={handleSkip}
                                    className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-sm flex items-center gap-1 transition-colors"
                                >
                                    Skip <SkipForward size={14} />
                                </button>
                            )}
                        </div>

                        {/* Question media */}
                        {question.media && (() => {
                            if (mediaLoading) {
                                return (
                                    <div className="mb-4 flex items-center justify-center h-32 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                        <span className="text-slate-400 dark:text-slate-500 text-sm">Loading media...</span>
                                    </div>
                                );
                            }

                            if (mediaError || !resolvedMediaUrl) {
                                return (
                                    <div className="mb-4 flex items-center justify-center h-24 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                        <span className="text-red-500 dark:text-red-400 text-sm">Failed to load media</span>
                                    </div>
                                );
                            }

                            if (isVideoMediaUrl(resolvedMediaUrl)) {
                                return (
                                    <div className="mb-4">
                                        <video
                                            src={resolvedMediaUrl}
                                            controls
                                            className="max-w-full max-h-80 rounded-lg border border-slate-200 dark:border-slate-700 mx-auto"
                                            title="Question video"
                                        >
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                );
                            }

                            return (
                                <div className="mb-4">
                                    <img
                                        src={resolvedMediaUrl}
                                        alt="Question illustration"
                                        className="max-w-full max-h-64 rounded-lg border border-slate-200 dark:border-slate-700 object-contain mx-auto"
                                    />
                                </div>
                            );
                        })()}

                        <div
                            role="heading"
                            aria-level={2}
                            className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-relaxed"
                        >
                            <RichText>{question.prompt}</RichText>
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-6 md:p-8 bg-white dark:bg-slate-800">
                        {question.type === 'multiple_choice' && (
                            <MultipleChoiceInput
                                question={question}
                                onAnswer={handleAnswer}
                                disabled={!!submittedAnswer}
                                submittedAnswer={submittedAnswer as number | null}
                            />
                        )}
                        {question.type === 'multiple_answer' && (
                            <MultipleAnswerInput
                                question={question}
                                onAnswer={handleAnswer}
                                disabled={!!submittedAnswer}
                                submittedAnswer={submittedAnswer as number[] | null}
                            />
                        )}
                        {question.type === 'true_false' && (
                            <TrueFalseInput
                                question={question}
                                onAnswer={handleAnswer}
                                disabled={!!submittedAnswer}
                                submittedAnswer={submittedAnswer as boolean | null}
                            />
                        )}
                        {question.type === 'keywords' && (
                            <KeywordsInput
                                question={question}
                                onAnswer={handleAnswer}
                                disabled={!!submittedAnswer}
                                submittedAnswer={submittedAnswer as string | null}
                            />
                        )}
                        {question.type === 'matching' && (
                            <MatchingInput
                                question={question}
                                onAnswer={handleAnswer}
                                disabled={!!submittedAnswer}
                                submittedAnswer={submittedAnswer as Record<string, string> | null}
                            />
                        )}
                        {question.type === 'word_bank' && (
                            <WordBankInput
                                question={question}
                                onAnswer={handleAnswer}
                                disabled={!!submittedAnswer}
                                submittedAnswer={submittedAnswer as string[] | null}
                            />
                        )}
                    </div>

                    {/* Feedback Area */}
                    <AnimatePresence>
                        {result && (
                            <motion.div
                                initial={{height: 0, opacity: 0}}
                                animate={{height: 'auto', opacity: 1}}
                                className={`border-t ${result.correct ? 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900/30' : 'bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30'}`}
                            >
                                <div className="p-6">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-full ${result.correct ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'}`}>
                                            {result.correct ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={`text-lg font-bold ${result.correct ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                                                {result.correct ? 'Correct!' : 'Not quite right'}
                                            </h3>
                                            {result.explanation && (
                                                <div className="mt-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                                                    <RichText>{result.explanation}</RichText>
                                                </div>
                                            )}
                                            {!result.correct && (
                                                <div className="mt-3 p-3 bg-white dark:bg-slate-900/50 rounded-lg border border-red-100 dark:border-red-900/30 text-sm">
                                                    <span className="font-semibold text-red-800 dark:text-red-300 block mb-1">Correct Answer:</span>
                                                    <div className="text-slate-700 dark:text-slate-300 font-medium">
                                                        {question.type === 'multiple_choice' && (
                                                            <span className="inline-flex mt-1">
                                                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded font-semibold">
                                                                    <RichText inline>{question.choices[question.answerIndex]}</RichText>
                                                                </span>
                                                            </span>
                                                        )}
                                                        {question.type === 'multiple_answer' && (
                                                            <span className="flex flex-wrap gap-2 mt-1">
                                                                {question.answerIndices.map((i) => (
                                                                    <span key={i} className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded font-semibold">
                                                                        <RichText inline>{question.choices[i]}</RichText>
                                                                    </span>
                                                                ))}
                                                            </span>
                                                        )}
                                                        {question.type === 'true_false' && (
                                                            <span className="inline-flex mt-1">
                                                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded font-semibold">
                                                                    {question.answer ? 'True' : 'False'}
                                                                </span>
                                                            </span>
                                                        )}
                                                        {question.type === 'keywords' && (
                                                            <span className="flex flex-wrap gap-2 mt-1">
                                                                {(Array.isArray(question.answer) ? question.answer : [question.answer]).map((keyword, i, arr) => (
                                                                    <React.Fragment key={i}>
                                                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded font-semibold">
                                                                            <RichText inline>{keyword}</RichText>
                                                                        </span>
                                                                        {i < arr.length - 1 && <span className="text-slate-400 self-center">or</span>}
                                                                    </React.Fragment>
                                                                ))}
                                                            </span>
                                                        )}
                                                        {question.type === 'matching' && (
                                                            <div className="flex flex-col gap-2 mt-1">
                                                                {question.pairs.map((pair, i) => (
                                                                    <div key={i} className="flex items-center gap-2 flex-wrap">
                                                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded font-semibold">
                                                                            <RichText inline>{pair.left}</RichText>
                                                                        </span>
                                                                        <span className="text-slate-400">→</span>
                                                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded font-semibold">
                                                                            <RichText inline>{pair.right}</RichText>
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {question.type === 'word_bank' && (
                                                            question.sentence.split(/(_)/g).map((part, i) => {
                                                                if (part === '_') {
                                                                    const blankIndex = (i - 1) / 2;
                                                                    return <span key={i} className="px-1.5 py-0.5 mx-0.5 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded font-bold"><RichText inline>{question.answers[blankIndex]}</RichText></span>;
                                                                }
                                                                return <span key={i}>{part}</span>;
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        <button
                                            onClick={() => useQuizStore.getState().nextQuestion()}
                                            className={`${result.correct ? 'btn-success' : 'btn-danger'} flex items-center gap-2`}
                                            autoFocus
                                        >
                                            Continue <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
