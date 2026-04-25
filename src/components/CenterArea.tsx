import React, {useState} from 'react';
import {useQuizStore, DEFAULT_SESSION_STATE} from '../store/useQuizStore';
import {QuestionCard} from './QuestionCard';
import {ErrorBoundary} from './ErrorBoundary';
import {SimpleConfirmModal} from './AppModals';
import {Shuffle, ListOrdered, RotateCcw, CheckCircle2} from 'lucide-react';


export const CenterArea: React.FC = () => {
    const {profiles, activeProfileId, setMode, restartQueue, setIncludeMastered} = useQuizStore();
    const [reviewMasteredOpen, setReviewMasteredOpen] = useState(false);
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const activeProfile = profiles[activeProfileId];
    const subjects = activeProfile?.subjects ?? [];
    const session = activeProfile?.session ?? DEFAULT_SESSION_STATE;

    const currentSubject = subjects.find(s => s.id === session.subjectId);

    // Find current question object
    let currentQuestion = null;
    let currentTopic = null;

    if (currentSubject && session.currentQuestionId) {
        for (const topic of currentSubject.topics) {
            const q = topic.questions.find(q => q.id === session.currentQuestionId);
            if (q) {
                currentQuestion = q;
                currentTopic = topic;
                break;
            }
        }
    }

    if (!currentSubject) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-500 dark:text-slate-400">
                <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6">
                    <ListOrdered size={40} className="text-indigo-400 dark:text-indigo-500" />
                </div>
                <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">Ready to study?</h2>
                <p>Select a subject from the sidebar to begin.</p>
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">All Caught Up!</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                    You've mastered all the selected questions. Great job!
                    You can include mastered questions to keep practicing or select different topics.
                </p>
                <button
                    onClick={() => {
                        if (!session.includeMastered) {
                            setReviewMasteredOpen(true);
                        } else {
                            restartQueue();
                        }
                    }}
                    className="btn-primary flex items-center gap-2"
                >
                    <RotateCcw size={18} />
                    Start Over
                </button>
                <SimpleConfirmModal
                    open={reviewMasteredOpen}
                    title="Review mastered questions?"
                    confirmLabel="Include mastered"
                    confirmClassName="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                    onClose={() => setReviewMasteredOpen(false)}
                    onConfirm={() => {
                        setIncludeMastered(true);
                        setReviewMasteredOpen(false);
                        restartQueue();
                    }}
                >
                    <p>
                        All questions in your selection are mastered. Include mastered questions so you can review them
                        again?
                    </p>
                </SimpleConfirmModal>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Top Bar */}
            <div className="flex-shrink-0 p-4 md:p-6 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-100 dark:border-slate-700 z-20">
                <div className="flex items-center gap-3">
                    {currentTopic && (
                        <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wide">
                            {currentTopic.name}
                        </span>
                    )}
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        {/* Don't double-count if current question was re-added to queue after wrong answer */}
                        Queue: {session.queue.includes(session.currentQuestionId!)
                            ? session.queue.length
                            : session.queue.length + 1}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        disabled={feedbackVisible}
                        onClick={() => setMode(session.mode === 'random' ? 'topic_order' : 'random')}
                        aria-label={session.mode === 'random' ? 'Switch to topic order mode' : 'Switch to random mode'}
                        aria-pressed={session.mode === 'random'}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={session.mode === 'random' ? "Switch to Topic Order" : "Switch to Random Shuffle"}
                    >
                        {session.mode === 'random' ? <Shuffle size={20} /> : <ListOrdered size={20} />}
                    </button>
                </div>
            </div>

            {/* Question Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="min-h-full flex flex-col items-center justify-center">
                    <ErrorBoundary 
                        key={`eb-${currentQuestion.id}-${session.turnCounter}`}
                        fallbackMessage="This question contains invalid formatting or corrupted data."
                        onSkip={() => useQuizStore.getState().skipQuestion()} // Skip safely
                    >
                        {/* Key uses turnCounter from store to force remount when advancing to same question */}
                        <QuestionCard
                            key={`${currentQuestion.id}-${session.turnCounter}`}
                            question={currentQuestion}
                            onFeedbackVisibilityChange={setFeedbackVisible}
                        />
                    </ErrorBoundary>
                </div>
            </div>
        </div>
    );
};
