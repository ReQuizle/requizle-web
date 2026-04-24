import React, {useState, useEffect, useCallback, useRef} from 'react';
import {Link} from 'react-router-dom';
import {createPortal} from 'react-dom';
import {useQuizStore, DEFAULT_SESSION_STATE} from '../store/useQuizStore';
import {calculateMastery} from '../utils/quizLogic';
import {CheckCircle2, Circle, Trash2, Download, RotateCcw, CheckCheck, X, SquarePen} from 'lucide-react';
import {clsx} from 'clsx';
import {Logo} from './Logo';
import {SimpleConfirmModal, TypeToConfirmModal} from './AppModals';
import type {Subject, Topic, SubjectExportV1, QuestionProgress} from '../types';
import {extractMediaId, getMedia, isIndexedDBMedia, serializeMediaEntry} from '../utils/mediaStorage';
import {triggerJsonDownload} from '../utils/download';

type ContextMenuState =
    | null
    | {kind: 'subject'; subject: Subject; x: number; y: number}
    | {kind: 'topic'; subject: Subject; topic: Topic; x: number; y: number};

type SimpleConfirmState =
    | null
    | {
        variant: 'resetSubject' | 'resetTopic';
        subjectId: string;
        subjectName: string;
        topicId?: string;
        topicName?: string;
    };

async function buildSubjectExportPayload(
    subject: Subject,
    progressSlice: Record<string, Record<string, QuestionProgress>>,
    options?: {includeProgress?: boolean}
): Promise<SubjectExportV1> {
    const includeProgress = options?.includeProgress !== false;
    const mediaIds = new Set<string>();
    subject.topics.forEach(topic => {
        topic.questions.forEach(q => {
            if (q.media && isIndexedDBMedia(q.media)) {
                mediaIds.add(extractMediaId(q.media));
            }
        });
    });
    const mediaEntries = await Promise.all([...mediaIds].map((id) => getMedia(id)));
    const mediaExports: NonNullable<SubjectExportV1['_media']> = await Promise.all(
        mediaEntries
            .filter((media): media is NonNullable<typeof media> => Boolean(media))
            .map(media => serializeMediaEntry(media))
    );
    return {
        requizleSubjectExport: 1,
        subject,
        ...(includeProgress ? {progress: progressSlice} : {}),
        ...(mediaExports.length > 0 ? {_media: mediaExports} : {})
    };
}

const LONG_PRESS_MS = 480;
const LONG_PRESS_MOVE_PX = 14;

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

    const closeContextMenu = useCallback(() => setContextMenu(null), []);

    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressOriginRef = useRef<{x: number; y: number} | null>(null);
    const longPressCoordsRef = useRef<{x: number; y: number}>({x: 0, y: 0});
    const longPressTargetRef = useRef<
        | {kind: 'subject'; subject: Subject}
        | {kind: 'topic'; subject: Subject; topic: Topic}
        | null
    >(null);
    const suppressNextClickRef = useRef(false);

    const killLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const resetLongPressTracking = useCallback(() => {
        killLongPressTimer();
        longPressOriginRef.current = null;
        longPressTargetRef.current = null;
    }, [killLongPressTimer]);

    const startLongPress = useCallback(
        (
            target: {kind: 'subject'; subject: Subject} | {kind: 'topic'; subject: Subject; topic: Topic},
            e: React.TouchEvent
        ) => {
            if (e.touches.length !== 1) {
                resetLongPressTracking();
                return;
            }
            resetLongPressTracking();
            const t = e.touches[0];
            longPressTargetRef.current = target;
            longPressOriginRef.current = {x: t.clientX, y: t.clientY};
            longPressCoordsRef.current = {x: t.clientX, y: t.clientY};
            longPressTimerRef.current = setTimeout(() => {
                longPressTimerRef.current = null;
                const tgt = longPressTargetRef.current;
                const coords = longPressCoordsRef.current;
                longPressTargetRef.current = null;
                longPressOriginRef.current = null;
                if (!tgt) return;
                suppressNextClickRef.current = true;
                if (tgt.kind === 'subject') {
                    setContextMenu({kind: 'subject', subject: tgt.subject, x: coords.x, y: coords.y});
                } else {
                    setContextMenu({kind: 'topic', subject: tgt.subject, topic: tgt.topic, x: coords.x, y: coords.y});
                }
                try {
                    navigator.vibrate?.(20);
                } catch {
                    /* ignore */
                }
            }, LONG_PRESS_MS);
        },
        [resetLongPressTracking]
    );

    const onLongPressTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (!longPressTimerRef.current || !longPressOriginRef.current) return;
            const t = e.touches[0];
            if (!t) return;
            longPressCoordsRef.current = {x: t.clientX, y: t.clientY};
            const o = longPressOriginRef.current;
            if (
                Math.abs(t.clientX - o.x) > LONG_PRESS_MOVE_PX ||
                Math.abs(t.clientY - o.y) > LONG_PRESS_MOVE_PX
            ) {
                resetLongPressTracking();
            }
        },
        [resetLongPressTracking]
    );

    const onLongPressTouchEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            resetLongPressTracking();
        }
    }, [resetLongPressTracking]);

    const swallowSyntheticClickAfterLongPress = useCallback((e: React.MouseEvent) => {
        if (!suppressNextClickRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        suppressNextClickRef.current = false;
    }, []);

    useEffect(() => () => resetLongPressTracking(), [resetLongPressTracking]);

    useEffect(() => {
        if (!contextMenu) return;
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-context-menu]')) return;
            closeContextMenu();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeContextMenu();
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [contextMenu, closeContextMenu]);

    const activeProfile = profiles[activeProfileId];
    const subjects = activeProfile?.subjects ?? [];
    const progress = activeProfile?.progress ?? {};
    const session = activeProfile?.session ?? DEFAULT_SESSION_STATE;

    const currentSubject = subjects.find(s => s.id === session.subjectId);

    const openSubjectMenu = (e: React.MouseEvent, subject: Subject) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({kind: 'subject', subject, x: e.clientX, y: e.clientY});
    };

    const openTopicMenu = (e: React.MouseEvent, subject: Subject, topic: Topic) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({kind: 'topic', subject, topic, x: e.clientX, y: e.clientY});
    };

    const handleExportSubject = async (subject: Subject, includeProgress: boolean) => {
        closeContextMenu();
        const slice = progress[subject.id] || {};
        try {
            const payload = await buildSubjectExportPayload(subject, slice, {includeProgress});
            const safeName = subject.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/gi, '') || 'subject';
            const suffix = includeProgress ? '' : '-questions';
            triggerJsonDownload(payload, `requizle-subject-${safeName}${suffix}.json`);
            setExportError(null);
        } catch (err) {
            console.error(err);
            setExportError('Export failed. Try again.');
        }
    };

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

                        const flatProgress = Object.values(progress[subject.id] || {}).reduce((acc, val) => ({...acc, ...val}), {});
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
                                    "w-full text-left p-3 rounded-xl transition-all duration-200 group relative [-webkit-touch-callout:none]",
                                    isActive
                                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-200 dark:ring-indigo-800"
                                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                )}
                                aria-haspopup="menu"
                            >
                                <button
                                    type="button"
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
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (settings.confirmSubjectDelete) {
                                            setDeleteConfirm({id: subject.id, name: subject.name});
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
                                type="button"
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
                                    className="rounded-lg [-webkit-touch-callout:none]"
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

            {contextMenu && createPortal(
                <div
                    data-context-menu
                    role="menu"
                    className="fixed z-[100] min-w-[200px] py-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl"
                    style={(() => {
                        const pad = 8;
                        const mw = 220;
                        const mh = contextMenu.kind === 'subject' ? 230 : 180;
                        const vw = typeof window !== 'undefined' ? window.innerWidth : contextMenu.x + mw;
                        const vh = typeof window !== 'undefined' ? window.innerHeight : contextMenu.y + mh;
                        return {
                            left: Math.max(pad, Math.min(contextMenu.x, vw - mw - pad)),
                            top: Math.max(pad, Math.min(contextMenu.y, vh - mh - pad))
                        };
                    })()}
                >
                    {contextMenu.kind === 'subject' && (
                        <>
                            <button
                                type="button"
                                role="menuitem"
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                onClick={() => handleExportSubject(contextMenu.subject, true)}
                            >
                                <Download size={16} className="text-slate-500 shrink-0" />
                                Export with progress
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                onClick={() => handleExportSubject(contextMenu.subject, false)}
                            >
                                <Download size={16} className="text-slate-500 shrink-0" />
                                Export questions only
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                onClick={() => {
                                    closeContextMenu();
                                    if (settings.confirmResetSubjectProgress) {
                                        setSimpleConfirm({
                                            variant: 'resetSubject',
                                            subjectId: contextMenu.subject.id,
                                            subjectName: contextMenu.subject.name
                                        });
                                    } else {
                                        resetSubjectProgress(contextMenu.subject.id);
                                    }
                                }}
                            >
                                <RotateCcw size={16} className="text-slate-500 shrink-0" />
                                Reset subject progress
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => {
                                    closeContextMenu();
                                    if (settings.confirmSubjectDelete) {
                                        setDeleteConfirm({id: contextMenu.subject.id, name: contextMenu.subject.name});
                                    } else {
                                        deleteSubject(contextMenu.subject.id);
                                    }
                                }}
                            >
                                <Trash2 size={16} className="shrink-0" />
                                Delete subject
                            </button>
                        </>
                    )}
                    {contextMenu.kind === 'topic' && (
                        <>
                            <button
                                type="button"
                                role="menuitem"
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                onClick={() => {
                                    closeContextMenu();
                                    markTopicMastered(contextMenu.subject.id, contextMenu.topic.id);
                                }}
                            >
                                <CheckCheck size={16} className="text-slate-500 shrink-0" />
                                Mark topic mastered
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                onClick={() => {
                                    closeContextMenu();
                                    if (settings.confirmResetTopicProgress) {
                                        setSimpleConfirm({
                                            variant: 'resetTopic',
                                            subjectId: contextMenu.subject.id,
                                            subjectName: contextMenu.subject.name,
                                            topicId: contextMenu.topic.id,
                                            topicName: contextMenu.topic.name
                                        });
                                    } else {
                                        resetTopicProgress(contextMenu.subject.id, contextMenu.topic.id);
                                    }
                                }}
                            >
                                <RotateCcw size={16} className="text-slate-500 shrink-0" />
                                Reset topic progress
                            </button>
                        </>
                    )}
                </div>,
                document.body
            )}

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
        </div>
    );
};
