import React, {useState} from 'react';
import {createPortal} from 'react-dom';
import {useQuizStore, DEFAULT_SESSION_STATE} from '../store/useQuizStore';
import {calculateMastery} from '../utils/quizLogic';
import {CheckCircle2, Circle, Trash2} from 'lucide-react';
import {clsx} from 'clsx';
import {Logo} from './Logo';

export const LeftSidebar: React.FC = () => {
    const {profiles, activeProfileId, startSession, toggleTopic, selectAllTopics, setIncludeMastered, deleteSubject, settings} = useQuizStore();
    const [deleteConfirm, setDeleteConfirm] = useState<{id: string; name: string} | null>(null);
    const [deleteInput, setDeleteInput] = useState('');
    const activeProfile = profiles[activeProfileId];
    const subjects = activeProfile?.subjects ?? [];
    const progress = activeProfile?.progress ?? {};
    const session = activeProfile?.session ?? DEFAULT_SESSION_STATE;

    const currentSubject = subjects.find(s => s.id === session.subjectId);

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Logo size={40} />
                    ReQuizle
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Master your subjects</p>
            </div>

            {/* Subject List */}
            <div className="space-y-4">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subjects</h2>
                <div className="space-y-2">
                    {subjects.map(subject => {
                        const isActive = session.subjectId === subject.id;
                        const allQuestions = subject.topics.flatMap(t => t.questions);

                        const flatProgress = Object.values(progress[subject.id] || {}).reduce((acc, val) => ({...acc, ...val}), {});
                        const masteryPct = calculateMastery(allQuestions, flatProgress);

                        return (
                            <div
                                key={subject.id}
                                className={clsx(
                                    "w-full text-left p-3 rounded-xl transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-200 dark:ring-indigo-800"
                                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                )}
                            >
                                <button
                                    onClick={() => !isActive && startSession(subject.id)}
                                    className="w-full text-left"
                                >
                                    <div className="flex justify-between items-start mb-1 gap-2">
                                        <span className={clsx("font-medium", isActive ? "text-indigo-900 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300")}>
                                            {subject.name}
                                        </span>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full",
                                                masteryPct === 100 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                            )}>
                                                {masteryPct}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 flex gap-3">
                                        <span>{subject.topics.length} topics</span>
                                        <span>{allQuestions.length} questions</span>
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (settings.confirmSubjectDelete) {
                                            setDeleteConfirm({id: subject.id, name: subject.name});
                                            setDeleteInput('');
                                        } else {
                                            deleteSubject(subject.id);
                                        }
                                    }}
                                    className="absolute bottom-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                    title="Delete subject"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })}
                    {subjects.length === 0 && (
                        <p className="text-sm text-slate-400 italic">No subjects loaded.</p>
                    )}
                </div>
            </div>

            {/* Topic List (if subject selected) */}
            {currentSubject && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Topics in {currentSubject.name}
                        </h2>
                        {session.selectedTopicIds.length === 0 ? (
                            <span className="text-xs text-slate-400">All Selected</span>
                        ) : (
                            <button
                                onClick={selectAllTopics}
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
                            >
                                Select All
                            </button>
                        )}
                    </div>

                    <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                        {currentSubject.topics.map(topic => {
                            const isSelected = session.selectedTopicIds.length === 0 || session.selectedTopicIds.includes(topic.id);
                            const topicProgress = (progress[currentSubject.id] || {})[topic.id] || {};
                            const masteryPct = calculateMastery(topic.questions, topicProgress);

                            return (
                                <button
                                    key={topic.id}
                                    onClick={() => toggleTopic(topic.id)}
                                    className={clsx(
                                        "w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors",
                                        isSelected ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    <div className={clsx("flex-shrink-0", isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-300 dark:text-slate-600")}>
                                        {isSelected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className={clsx("font-medium truncate", isSelected ? "text-slate-700 dark:text-slate-200" : "text-slate-500 dark:text-slate-400")}>
                                            {topic.name}
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 mt-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-green-500 h-full rounded-full transition-all duration-500"
                                                style={{width: `${masteryPct}%`}}
                                            />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Include Mastered Toggle */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={session.includeMastered}
                                    onChange={(e) => setIncludeMastered(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 dark:peer-focus:ring-indigo-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">
                                Include Mastered
                                <span className="block text-xs text-slate-400 dark:text-slate-500 font-normal">Practice mode</span>
                            </span>
                        </label>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Subject</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            This will permanently delete <strong className="text-slate-900 dark:text-white">{deleteConfirm.name}</strong> and all its topics, questions, and progress.
                        </p>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-600 dark:text-slate-400">
                                Type <strong className="text-red-600 dark:text-red-400">{deleteConfirm.name}</strong> to confirm:
                            </label>
                            <input
                                type="text"
                                value={deleteInput}
                                onChange={(e) => setDeleteInput(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                placeholder="Type subject name..."
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => {
                                    setDeleteConfirm(null);
                                    setDeleteInput('');
                                }}
                                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (deleteInput === deleteConfirm.name) {
                                        deleteSubject(deleteConfirm.id);
                                        setDeleteConfirm(null);
                                        setDeleteInput('');
                                    }
                                }}
                                disabled={deleteInput !== deleteConfirm.name}
                                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-900 disabled:cursor-not-allowed rounded-lg transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
