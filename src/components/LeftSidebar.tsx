import React, {useState, useCallback} from 'react';
import {Link} from 'react-router-dom';
import {useQuizStore, DEFAULT_SESSION_STATE} from '../store/useQuizStore';
import {calculateMastery} from '../utils/quizLogic';
import {CheckCircle2, Circle, X, SquarePen, EllipsisVertical} from 'lucide-react';
import {clsx} from 'clsx';
import {Logo} from './Logo';
import {SimpleConfirmModal, TypeToConfirmModal} from './AppModals';
import type {Subject, Topic, SubjectExportV1, QuestionProgress} from '../types';
import {triggerBlobDownload, triggerJsonDownload} from '../utils/download';
import {createRqzlArchiveBlob, type ArchiveMediaEntry} from '../utils/rqzlArchive';
import {getArchiveMediaEntriesForSubjects} from '../utils/archiveMedia';
import {
    SidebarContextMenu,
    type ContextMenuState
} from './leftSidebar/SidebarContextMenu';
import {
    SubjectExportModal,
    type SubjectExportOptions
} from './leftSidebar/SubjectExportModal';
import {flattenProgress} from '../store/quizStoreHelpers';
import {useLongPress} from '../utils/useLongPress';

type SimpleConfirmState =
    | null
    | {
        variant: 'resetSubject' | 'resetTopic';
        subjectId: string;
        subjectName: string;
        topicId?: string;
        topicName?: string;
    };

const DEFAULT_SUBJECT_EXPORT_OPTIONS: SubjectExportOptions = {
    includeProgress: true,
    includeMedia: true,
    format: 'rqzl'
};

async function buildSubjectExportPayload(
    subject: Subject,
    progressSlice: Record<string, Record<string, QuestionProgress>>,
    options?: {includeProgress?: boolean; includeMedia?: boolean}
): Promise<{payload: SubjectExportV1; mediaEntries: ArchiveMediaEntry[]}> {
    const includeProgress = options?.includeProgress !== false;
    const includeMedia = options?.includeMedia !== false;
    const mediaEntries = includeMedia
        ? await getArchiveMediaEntriesForSubjects([subject])
        : [];
    const payload: SubjectExportV1 = {
        requizleSubjectExport: 1,
        subject,
        ...(includeProgress ? {progress: progressSlice} : {})
    };
    return {payload, mediaEntries};
}

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
    const [simpleConfirm, setSimpleConfirm] = useState<SimpleConfirmState>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const [subjectExportModal, setSubjectExportModal] = useState<{
        subject: Subject;
        options: SubjectExportOptions;
    } | null>(null);

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const {
        startLongPress,
        onLongPressTouchMove,
        onLongPressTouchEnd,
        swallowSyntheticClickAfterLongPress
    } = useLongPress<
        | {kind: 'subject'; subject: Subject}
        | {kind: 'topic'; subject: Subject; topic: Topic}
    >({
        onLongPress: (target, coords) => {
            if (target.kind === 'subject') {
                setContextMenu({kind: 'subject', subject: target.subject, x: coords.x, y: coords.y});
            } else {
                setContextMenu({
                    kind: 'topic',
                    subject: target.subject,
                    topic: target.topic,
                    x: coords.x,
                    y: coords.y
                });
            }
        }
    });

    const activeProfile = profiles[activeProfileId];
    const subjects = activeProfile?.subjects ?? [];
    const progress = activeProfile?.progress ?? {};
    const session = activeProfile?.session ?? DEFAULT_SESSION_STATE;

    const currentSubject = subjects.find(s => s.id === session.subjectId);

    const openSubjectMenu = (e: React.MouseEvent<HTMLElement>, subject: Subject) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({kind: 'subject', subject, x: e.clientX, y: e.clientY, triggerEl: e.currentTarget});
    };

    const openTopicMenu = (e: React.MouseEvent<HTMLElement>, subject: Subject, topic: Topic) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({kind: 'topic', subject, topic, x: e.clientX, y: e.clientY, triggerEl: e.currentTarget});
    };

    const openSubjectMenuFromTrigger = (subject: Subject, trigger: HTMLElement) => {
        const rect = trigger.getBoundingClientRect();
        setContextMenu({
            kind: 'subject',
            subject,
            x: rect.right,
            y: rect.bottom,
            triggerEl: trigger
        });
    };

    const openTopicMenuFromTrigger = (subject: Subject, topic: Topic, trigger: HTMLElement) => {
        const rect = trigger.getBoundingClientRect();
        setContextMenu({
            kind: 'topic',
            subject,
            topic,
            x: rect.right,
            y: rect.bottom,
            triggerEl: trigger
        });
    };

    const performSubjectExport = async (subject: Subject, options: SubjectExportOptions) => {
        const slice = progress[subject.id] || {};
        try {
            const {payload, mediaEntries} = await buildSubjectExportPayload(subject, slice, {
                includeProgress: options.includeProgress,
                includeMedia: options.includeMedia
            });
            const safeName = subject.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/gi, '') || 'subject';
            const suffix = options.includeProgress ? '' : '-questions';
            const baseFilename = `requizle-subject-${safeName}${suffix}`;

            if (options.format === 'json') {
                triggerJsonDownload(payload, `${baseFilename}.json`);
            } else {
                const archive = await createRqzlArchiveBlob(payload, mediaEntries);
                const ext = options.format === 'zip' ? 'zip' : 'rqzl';
                triggerBlobDownload(archive, `${baseFilename}.${ext}`);
            }
            setExportError(null);
        } catch (err) {
            console.error(err);
            setExportError('Export failed. Try again.');
        }
    };

    const handleQuickExportSubject = (subject: Subject) => {
        closeContextMenu();
        void performSubjectExport(subject, DEFAULT_SUBJECT_EXPORT_OPTIONS);
    };

    const handleOpenSubjectExportAs = (subject: Subject) => {
        closeContextMenu();
        setSubjectExportModal({
            subject,
            options: {...DEFAULT_SUBJECT_EXPORT_OPTIONS}
        });
    };

    const setSubjectExportOption = <K extends keyof SubjectExportOptions>(key: K, value: SubjectExportOptions[K]) => {
        setSubjectExportModal(prev => (prev ? {...prev, options: {...prev.options, [key]: value}} : prev));
    };

    const handleResetSubjectProgressFromContext = (subject: Subject) => {
        closeContextMenu();
        if (settings.confirmResetSubjectProgress) {
            setSimpleConfirm({
                variant: 'resetSubject',
                subjectId: subject.id,
                subjectName: subject.name
            });
            return;
        }
        resetSubjectProgress(subject.id);
    };

    const handleDeleteSubjectFromContext = (subject: Subject) => {
        closeContextMenu();
        if (settings.confirmSubjectDelete) {
            setDeleteConfirm({id: subject.id, name: subject.name});
            return;
        }
        deleteSubject(subject.id);
    };

    const handleMarkTopicMasteredFromContext = (subject: Subject, topic: Topic) => {
        closeContextMenu();
        markTopicMastered(subject.id, topic.id);
    };

    const handleResetTopicProgressFromContext = (subject: Subject, topic: Topic) => {
        closeContextMenu();
        if (settings.confirmResetTopicProgress) {
            setSimpleConfirm({
                variant: 'resetTopic',
                subjectId: subject.id,
                subjectName: subject.name,
                topicId: topic.id,
                topicName: topic.name
            });
            return;
        }
        resetTopicProgress(subject.id, topic.id);
    };

    const getSubjectMasteryPct = (subject: Subject): number => {
        const allQuestions = subject.topics.flatMap(topic => topic.questions);
        const flatProgress = flattenProgress(progress[subject.id]);
        return calculateMastery(allQuestions, flatProgress);
    };

    const getTopicMasteryPct = (subject: Subject, topic: Topic): number => {
        const topicProgress = (progress[subject.id] || {})[topic.id] || {};
        return calculateMastery(topic.questions, topicProgress);
    };

    const showResetSubjectProgress =
        contextMenu?.kind === 'subject' ? getSubjectMasteryPct(contextMenu.subject) > 0 : false;
    const showMarkTopicMastered =
        contextMenu?.kind === 'topic' ? getTopicMasteryPct(contextMenu.subject, contextMenu.topic) < 100 : false;
    const showResetTopicProgress =
        contextMenu?.kind === 'topic' ? getTopicMasteryPct(contextMenu.subject, contextMenu.topic) > 0 : false;

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
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
                    <SquarePen size={16} aria-hidden />
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

            {/* Subject List */}
            <div className="space-y-4">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subjects</h2>
                <div className="space-y-2">
                    {subjects.map(subject => {
                        const isActive = session.subjectId === subject.id;
                        const allQuestions = subject.topics.flatMap(t => t.questions);

                        const flatProgress = flattenProgress(progress[subject.id]);
                        const masteryPct = calculateMastery(allQuestions, flatProgress);

                        return (
                            <div
                                key={subject.id}
                                onContextMenu={e => openSubjectMenu(e, subject)}
                                onTouchStart={e => startLongPress({kind: 'subject', subject}, e)}
                                onTouchMove={onLongPressTouchMove}
                                onTouchEnd={onLongPressTouchEnd}
                                onTouchCancel={onLongPressTouchEnd}
                                onClickCapture={swallowSyntheticClickAfterLongPress}
                                className={clsx(
                                    "rounded-lg border transition-all duration-200 group relative [-webkit-touch-callout:none]",
                                    isActive
                                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800"
                                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700"
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => !isActive && startSession(subject.id)}
                                    className="w-full text-left p-3 pr-20 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                                >
                                    <div className={clsx("font-medium truncate mb-1", isActive ? "text-indigo-900 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300")}>
                                        {subject.name}
                                    </div>
                                    <div className="text-xs text-slate-500 flex gap-3">
                                        <span>{subject.topics.length} topics</span>
                                        <span>{allQuestions.length} questions</span>
                                    </div>
                                </button>
                                <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                                    <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full",
                                        masteryPct === 100 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                    )}>
                                        {masteryPct}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={e => {
                                            e.stopPropagation();
                                            openSubjectMenuFromTrigger(subject, e.currentTarget);
                                        }}
                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                                        aria-label={`Open actions for ${subject.name}`}
                                        aria-haspopup="menu"
                                        aria-expanded={contextMenu?.kind === 'subject' && contextMenu.subject.id === subject.id}
                                    >
                                        <EllipsisVertical size={14} />
                                    </button>
                                </div>
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
                                type="button"
                                onClick={selectAllTopics}
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
                            >
                                Select All
                            </button>
                        )}
                    </div>

                    <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-2">
                        {currentSubject.topics.map(topic => {
                            const isSelected = session.selectedTopicIds.length === 0 || session.selectedTopicIds.includes(topic.id);
                            const topicProgress = (progress[currentSubject.id] || {})[topic.id] || {};
                            const masteryPct = calculateMastery(topic.questions, topicProgress);

                            return (
                                <div
                                    key={topic.id}
                                    onContextMenu={e => openTopicMenu(e, currentSubject, topic)}
                                    onTouchStart={e =>
                                        startLongPress({kind: 'topic', subject: currentSubject, topic}, e)
                                    }
                                    onTouchMove={onLongPressTouchMove}
                                    onTouchEnd={onLongPressTouchEnd}
                                    onTouchCancel={onLongPressTouchEnd}
                                    onClickCapture={swallowSyntheticClickAfterLongPress}
                                    className="rounded-lg relative group [-webkit-touch-callout:none]"
                                    aria-haspopup="menu"
                                >
                                    <button
                                        type="button"
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
                                            <progress
                                                className="quiz-progress quiz-progress-sm quiz-progress-green"
                                                value={masteryPct}
                                                max={100}
                                                aria-label={`${topic.name} mastery`}
                                            />
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={e => {
                                            e.stopPropagation();
                                            openTopicMenuFromTrigger(currentSubject, topic, e.currentTarget);
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-indigo-400 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
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

                    {/* Include Mastered Toggle */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    className="toggle-switch-input"
                                    checked={session.includeMastered}
                                    onChange={(e) => setIncludeMastered(e.target.checked)}
                                />
                                <div className="toggle-switch-track"></div>
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">
                                Include Mastered
                                <span className="block text-xs text-slate-400 dark:text-slate-500 font-normal">Practice mode</span>
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
                onClose={closeContextMenu}
                onQuickExportSubject={handleQuickExportSubject}
                onExportAsSubject={handleOpenSubjectExportAs}
                onResetSubjectProgress={handleResetSubjectProgressFromContext}
                onDeleteSubject={handleDeleteSubjectFromContext}
                onMarkTopicMastered={handleMarkTopicMasteredFromContext}
                onResetTopicProgress={handleResetTopicProgressFromContext}
            />

            <SimpleConfirmModal
                open={!!simpleConfirm}
                title={
                    simpleConfirm?.variant === 'resetSubject'
                        ? 'Reset subject progress?'
                        : 'Reset topic progress?'
                }
                confirmLabel={
                    simpleConfirm?.variant === 'resetSubject' ? 'Reset progress' : 'Reset topic'
                }
                confirmClassName="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
                onClose={() => setSimpleConfirm(null)}
                onConfirm={() => {
                    if (!simpleConfirm) return;
                    if (simpleConfirm.variant === 'resetSubject') {
                        resetSubjectProgress(simpleConfirm.subjectId);
                    } else if (simpleConfirm.variant === 'resetTopic' && simpleConfirm.topicId) {
                        resetTopicProgress(simpleConfirm.subjectId, simpleConfirm.topicId);
                    }
                    setSimpleConfirm(null);
                }}
            >
                {simpleConfirm?.variant === 'resetSubject' && (
                    <p>
                        All mastery and attempts for{' '}
                        <strong className="text-slate-900 dark:text-white">{simpleConfirm.subjectName}</strong> will be
                        cleared. This cannot be undone.
                    </p>
                )}
                {simpleConfirm?.variant === 'resetTopic' && (
                    <p>
                        Progress for{' '}
                        <strong className="text-slate-900 dark:text-white">{simpleConfirm.topicName}</strong> in{' '}
                        {simpleConfirm.subjectName} will be cleared. This cannot be undone.
                    </p>
                )}
            </SimpleConfirmModal>

            <TypeToConfirmModal
                open={!!deleteConfirm}
                title="Delete Subject"
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

            <SubjectExportModal
                modalState={subjectExportModal}
                setOption={setSubjectExportOption}
                onClose={() => setSubjectExportModal(null)}
                onExport={(subject, options) => {
                    setSubjectExportModal(null);
                    void performSubjectExport(subject, options);
                }}
            />
        </div>
    );
};
