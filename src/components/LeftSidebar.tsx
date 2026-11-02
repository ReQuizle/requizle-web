import React, {useState} from 'react';
import {Link} from 'react-router-dom';
import {useQuizStore} from '../store/useQuizStore';
import {DEFAULT_SESSION_STATE} from '../store/defaults';
import {calculateMastery} from '../utils/quizLogic';
import {CheckCircle2, Circle, X, SquarePen, EllipsisVertical} from 'lucide-react';
import {clsx} from 'clsx';
import {Logo} from './Logo';
import {ToggleSwitch} from './ToggleSwitch';
import {SimpleConfirmModal, TypeToConfirmModal} from './AppModals';
import type {Subject, Topic, SubjectExportV1} from '../types';
import {downloadExport, DEFAULT_EXPORT_OPTIONS, toFileSlug, type ExportOptions} from '../utils/exportFiles';
import {MissingMediaError} from '../utils/archiveMedia';
import {SidebarContextMenu, type ContextMenuState} from './leftSidebar/SidebarContextMenu';
import {ExportOptionsModal} from './ExportOptionsModal';
import {flattenProgress} from '../store/quizStoreHelpers';
import {useLongPress} from '../utils/useLongPress';
import {plural} from '../utils/plural';

/** What a sidebar menu acts on */
type MenuTarget = {kind: 'subject'; subject: Subject} | {kind: 'topic'; subject: Subject; topic: Topic};

export const LeftSidebar: React.FC = () => {
    const {
        profiles,
        activeProfileId,
        startSession,
        toggleTopic,
        selectAllTopics,
        setIncludeMastered,
        deleteSubject,
        settings,
        resetSubjectProgress,
        resetTopicProgress,
        markTopicMastered
    } = useQuizStore();
    const [deleteConfirm, setDeleteConfirm] = useState<{id: string; name: string} | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
    const [resetConfirm, setResetConfirm] = useState<MenuTarget | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const [exportTarget, setExportTarget] = useState<Subject | null>(null);

    const longPressHandlers = useLongPress<MenuTarget>({
        onLongPress: (target, {x, y}) => setContextMenu({...target, x, y})
    });

    const activeProfile = profiles[activeProfileId];
    const subjects = activeProfile?.subjects ?? [];
    const progress = activeProfile?.progress ?? {};
    const session = activeProfile?.session ?? DEFAULT_SESSION_STATE;

    const currentSubject = subjects.find((s) => s.id === session.subjectId);

    /** Open the menu at the pointer, for a right click */
    const openMenuAtPointer = (e: React.MouseEvent<HTMLElement>, target: MenuTarget) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({...target, x: e.clientX, y: e.clientY, triggerEl: e.currentTarget});
    };

    /** Open the menu below its actions button */
    const openMenuFromButton = (e: React.MouseEvent<HTMLElement>, target: MenuTarget) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setContextMenu({...target, x: rect.right, y: rect.bottom, triggerEl: e.currentTarget});
    };

    const performSubjectExport = async (subject: Subject, options: ExportOptions) => {
        try {
            const payload: SubjectExportV1 = {
                requizleSubjectExport: 1,
                subject,
                ...(options.includeProgress ? {progress: progress[subject.id] ?? {}} : {})
            };
            const suffix = options.includeProgress ? '' : '-questions';
            await downloadExport(
                payload,
                [subject],
                `requizle-subject-${toFileSlug(subject.name, 'subject')}${suffix}`,
                options
            );
            setExportError(null);
        } catch (err) {
            console.error('Subject export failed:', err);
            setExportError(err instanceof MissingMediaError ? err.message : 'Export failed. Try again.');
        }
    };

    const handleResetSubjectProgress = (subject: Subject) => {
        if (settings.confirmResetSubjectProgress) {
            setResetConfirm({kind: 'subject', subject});
        } else {
            resetSubjectProgress(subject.id);
        }
    };

    const handleDeleteSubject = (subject: Subject) => {
        if (settings.confirmSubjectDelete) {
            setDeleteConfirm({id: subject.id, name: subject.name});
        } else {
            deleteSubject(subject.id);
        }
    };

    const handleResetTopicProgress = (subject: Subject, topic: Topic) => {
        if (settings.confirmResetTopicProgress) {
            setResetConfirm({kind: 'topic', subject, topic});
        } else {
            resetTopicProgress(subject.id, topic.id);
        }
    };

    const getSubjectMasteryPct = (subject: Subject): number => {
        const allQuestions = subject.topics.flatMap((topic) => topic.questions);
        const flatProgress = flattenProgress(progress[subject.id]);
        return calculateMastery(allQuestions, flatProgress);
    };

    const getTopicMasteryPct = (subject: Subject, topic: Topic): number =>
        calculateMastery(topic.questions, progress[subject.id]?.[topic.id] ?? {});

    const showResetSubjectProgress =
        contextMenu?.kind === 'subject' ? getSubjectMasteryPct(contextMenu.subject) > 0 : false;
    const showMarkTopicMastered =
        contextMenu?.kind === 'topic' ? getTopicMasteryPct(contextMenu.subject, contextMenu.topic) < 100 : false;
    const showResetTopicProgress =
        contextMenu?.kind === 'topic' ? getTopicMasteryPct(contextMenu.subject, contextMenu.topic) > 0 : false;

    return (
        <div className="p-6 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Logo size={40} />
                    ReQuizle
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Master your subjects</p>
                <Link
                    to="/edit"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                >
                    <SquarePen size={16} />
                    Edit content
                </Link>
            </div>

            {exportError && (
                <div
                    role="alert"
                    className="flex items-start gap-2 p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm text-red-800 dark:text-red-200"
                >
                    <span className="flex-1 min-w-0">{exportError}</span>
                    <button
                        type="button"
                        onClick={() => setExportError(null)}
                        className="shrink-0 p-0.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300"
                        aria-label="Dismiss export error"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            <div className="space-y-4">
                <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Subjects
                </h2>
                <div className="space-y-2">
                    {subjects.map((subject) => {
                        const isActive = session.subjectId === subject.id;
                        const questionCount = subject.topics.reduce((sum, t) => sum + t.questions.length, 0);
                        const masteryPct = getSubjectMasteryPct(subject);

                        return (
                            <div
                                key={subject.id}
                                onContextMenu={(e) => openMenuAtPointer(e, {kind: 'subject', subject})}
                                {...longPressHandlers({kind: 'subject', subject})}
                                className={clsx(
                                    'rounded-lg border transition-all duration-200 group relative [-webkit-touch-callout:none]',
                                    isActive
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700'
                                )}
                            >
                                <button
                                    type="button"
                                    aria-current={isActive || undefined}
                                    onClick={() => !isActive && startSession(subject.id)}
                                    className="w-full text-left p-3 pr-20 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                                >
                                    <div
                                        className={clsx(
                                            'font-medium truncate mb-1',
                                            isActive
                                                ? 'text-indigo-900 dark:text-indigo-300'
                                                : 'text-slate-700 dark:text-slate-300'
                                        )}
                                    >
                                        {subject.name}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex gap-3">
                                        <span>{plural(subject.topics.length, 'topic')}</span>
                                        <span>{plural(questionCount, 'question')}</span>
                                    </div>
                                </button>
                                <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                                    <span
                                        className={clsx(
                                            'text-xs font-bold px-2 py-0.5 rounded-full',
                                            masteryPct === 100
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                        )}
                                    >
                                        {masteryPct}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => openMenuFromButton(e, {kind: 'subject', subject})}
                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 text-slate-500 dark:text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                                        aria-label={`Open actions for ${subject.name}`}
                                        aria-haspopup="menu"
                                        aria-expanded={
                                            contextMenu?.kind === 'subject' && contextMenu.subject.id === subject.id
                                        }
                                    >
                                        <EllipsisVertical size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {subjects.length === 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">No subjects loaded.</p>
                    )}
                </div>
            </div>

            {currentSubject && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Topics in {currentSubject.name}
                        </h2>
                        {session.selectedTopicIds.length === 0 ? (
                            <span className="text-xs text-slate-500 dark:text-slate-400">All selected</span>
                        ) : (
                            <button
                                type="button"
                                onClick={selectAllTopics}
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
                            >
                                Select all
                            </button>
                        )}
                    </div>

                    <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-2">
                        {currentSubject.topics.map((topic) => {
                            const isSelected =
                                session.selectedTopicIds.length === 0 || session.selectedTopicIds.includes(topic.id);
                            const masteryPct = getTopicMasteryPct(currentSubject, topic);
                            const menuTarget: MenuTarget = {kind: 'topic', subject: currentSubject, topic};

                            return (
                                <div
                                    key={topic.id}
                                    onContextMenu={(e) => openMenuAtPointer(e, menuTarget)}
                                    {...longPressHandlers(menuTarget)}
                                    className="rounded-lg relative group [-webkit-touch-callout:none]"
                                >
                                    <button
                                        type="button"
                                        aria-pressed={isSelected}
                                        onClick={() => toggleTopic(topic.id)}
                                        className={clsx(
                                            'w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-colors',
                                            isSelected
                                                ? 'bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        )}
                                    >
                                        <div
                                            className={clsx(
                                                'shrink-0',
                                                isSelected
                                                    ? 'text-indigo-600 dark:text-indigo-400'
                                                    : 'text-slate-300 dark:text-slate-600'
                                            )}
                                        >
                                            {isSelected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <div
                                                className={clsx(
                                                    'font-medium truncate',
                                                    isSelected
                                                        ? 'text-slate-700 dark:text-slate-200'
                                                        : 'text-slate-500 dark:text-slate-400'
                                                )}
                                            >
                                                {topic.name}
                                                <span className="sr-only">, {masteryPct}% mastered</span>
                                            </div>
                                            <progress
                                                className="quiz-progress quiz-progress-sm quiz-progress-green"
                                                value={masteryPct}
                                                max={100}
                                                aria-hidden
                                            />
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => openMenuFromButton(e, menuTarget)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 text-slate-500 dark:text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                                        aria-label={`Open actions for ${topic.name}`}
                                        aria-haspopup="menu"
                                        aria-expanded={
                                            contextMenu?.kind === 'topic' &&
                                            contextMenu.subject.id === currentSubject.id &&
                                            contextMenu.topic.id === topic.id
                                        }
                                    >
                                        <EllipsisVertical size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <ToggleSwitch checked={session.includeMastered} onChange={setIncludeMastered} />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">
                                Include mastered
                                <span className="block text-xs text-slate-500 dark:text-slate-400 font-normal">
                                    Review questions you have already mastered
                                </span>
                            </span>
                        </label>
                    </div>
                </div>
            )}

            <SidebarContextMenu
                contextMenu={contextMenu}
                showResetSubjectProgress={showResetSubjectProgress}
                showMarkTopicMastered={showMarkTopicMastered}
                showResetTopicProgress={showResetTopicProgress}
                onClose={() => setContextMenu(null)}
                onQuickExportSubject={(subject) => void performSubjectExport(subject, DEFAULT_EXPORT_OPTIONS)}
                onExportAsSubject={setExportTarget}
                onResetSubjectProgress={handleResetSubjectProgress}
                onDeleteSubject={handleDeleteSubject}
                onMarkTopicMastered={(subject, topic) => markTopicMastered(subject.id, topic.id)}
                onResetTopicProgress={handleResetTopicProgress}
            />

            <SimpleConfirmModal
                open={!!resetConfirm}
                title={resetConfirm?.kind === 'subject' ? 'Reset subject progress?' : 'Reset topic progress?'}
                confirmLabel={resetConfirm?.kind === 'subject' ? 'Reset progress' : 'Reset topic'}
                confirmTone="warning"
                onClose={() => setResetConfirm(null)}
                onConfirm={() => {
                    if (resetConfirm?.kind === 'subject') {
                        resetSubjectProgress(resetConfirm.subject.id);
                    } else if (resetConfirm?.kind === 'topic') {
                        resetTopicProgress(resetConfirm.subject.id, resetConfirm.topic.id);
                    }
                    setResetConfirm(null);
                }}
            >
                {resetConfirm?.kind === 'subject' && (
                    <p>
                        All mastery and attempts for{' '}
                        <strong className="text-slate-900 dark:text-white">{resetConfirm.subject.name}</strong> will be
                        cleared. This cannot be undone.
                    </p>
                )}
                {resetConfirm?.kind === 'topic' && (
                    <p>
                        Progress for{' '}
                        <strong className="text-slate-900 dark:text-white">{resetConfirm.topic.name}</strong> in{' '}
                        {resetConfirm.subject.name} will be cleared. This cannot be undone.
                    </p>
                )}
            </SimpleConfirmModal>

            <TypeToConfirmModal
                open={!!deleteConfirm}
                title="Delete subject"
                description={
                    <>
                        This will permanently delete{' '}
                        <strong className="text-slate-900 dark:text-white">{deleteConfirm?.name}</strong> and all its
                        topics, questions, and progress.
                    </>
                }
                phraseToMatch={deleteConfirm?.name ?? ''}
                inputPlaceholder="Type subject name..."
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => {
                    if (deleteConfirm) deleteSubject(deleteConfirm.id);
                    setDeleteConfirm(null);
                }}
            />

            <ExportOptionsModal
                open={!!exportTarget}
                title="Export subject"
                targetLabel={exportTarget?.name ?? ''}
                onClose={() => setExportTarget(null)}
                onExport={(options) => {
                    if (exportTarget) void performSubjectExport(exportTarget, options);
                    setExportTarget(null);
                }}
            />
        </div>
    );
};
