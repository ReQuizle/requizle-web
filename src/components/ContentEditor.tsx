import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useQuizStore} from '../store/useQuizStore';
import type {Question, QuestionType, Topic} from '../types';
import {QUESTION_TYPES, createEmptyQuestion, migrateQuestionShape} from '../utils/contentEditor';
import {
    createMediaRef,
    createMediaObjectUrl,
    extractMediaId,
    getMedia,
    isIndexedDBMedia,
    revokeMediaObjectUrl,
    storeMedia
} from '../utils/mediaStorage';
import {isVideoMediaUrl} from '../utils/mediaFormat';
import {hasDuplicateStrings, hasEnoughWordBankEntries} from '../utils/validationHelpers';
import {clsx} from 'clsx';
import {BookOpen, Layers, Plus, Save, Trash2, Upload} from 'lucide-react';
import {SimpleConfirmModal, TypeToConfirmModal} from './AppModals';

function getQuestionDraftError(question: Question): string | null {
    if (!question.prompt.trim()) return 'Prompt is required.';

    switch (question.type) {
        case 'multiple_choice':
            if (question.choices.length < 2 || question.choices.some(choice => !choice.trim())) {
                return 'Multiple choice questions need at least two filled choices.';
            }
            if (question.answerIndex < 0 || question.answerIndex >= question.choices.length) {
                return 'Choose a valid correct answer.';
            }
            return null;

        case 'multiple_answer': {
            if (question.choices.length < 2 || question.choices.some(choice => !choice.trim())) {
                return 'Multiple answer questions need at least two filled choices.';
            }
            const uniqueAnswers = new Set(question.answerIndices);
            const answerInRange = question.answerIndices.every(
                index => Number.isInteger(index) && index >= 0 && index < question.choices.length
            );
            if (question.answerIndices.length === 0 || uniqueAnswers.size !== question.answerIndices.length || !answerInRange) {
                return 'Choose at least one valid correct answer.';
            }
            return null;
        }

        case 'keywords': {
            const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
            return answers.length > 0 && answers.every(answer => answer.trim())
                ? null
                : 'Add at least one accepted answer.';
        }

        case 'true_false':
            return null;

        case 'matching': {
            const leftValues = question.pairs.map(pair => pair.left);
            const rightValues = question.pairs.map(pair => pair.right);
            if (question.pairs.length === 0 || [...leftValues, ...rightValues].some(value => !value.trim())) {
                return 'Matching questions need filled left and right values.';
            }
            if (
                hasDuplicateStrings(leftValues, {trim: true}) ||
                hasDuplicateStrings(rightValues, {trim: true})
            ) {
                return 'Matching left and right values must be unique.';
            }
            return null;
        }

        case 'word_bank': {
            const blankCount = question.sentence.split('_').length - 1;
            if (!question.sentence.trim() || blankCount === 0) {
                return 'Add a sentence with at least one blank.';
            }
            if (question.wordBank.length === 0 || question.wordBank.some(word => !word.trim())) {
                return 'Add at least one filled word bank entry.';
            }
            if (question.answers.length !== blankCount || question.answers.some(answer => !answer.trim())) {
                return 'Add one filled answer for each blank.';
            }
            if (!hasEnoughWordBankEntries(question.wordBank, question.answers, {trim: true})) {
                return 'Each answer must appear in the word bank enough times.';
            }
            return null;
        }
    }
}

function QuestionMediaEditor({
    media,
    onMediaChange
}: {
    media: string | undefined;
    onMediaChange: (next: string | undefined) => void;
}) {
    const needsAsyncLoad = media && isIndexedDBMedia(media);
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(
        media && !needsAsyncLoad ? media : null
    );
    const [mediaLoading, setMediaLoading] = useState(!!needsAsyncLoad);
    const [mediaError, setMediaError] = useState(false);
    const [uploadBusy, setUploadBusy] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    useEffect(() => {
        if (!media) {
            setResolvedUrl(null);
            setMediaLoading(false);
            setMediaError(false);
            return;
        }
        if (!isIndexedDBMedia(media)) {
            setResolvedUrl(media);
            setMediaLoading(false);
            setMediaError(false);
            return;
        }

        setMediaLoading(true);
        setMediaError(false);
        setResolvedUrl(null);
        const mediaId = extractMediaId(media);
        let cancelled = false;

        getMedia(mediaId)
            .then(entry => {
                if (cancelled) return;
                if (entry) {
                    setResolvedUrl(createMediaObjectUrl(entry));
                    setMediaError(false);
                } else {
                    setResolvedUrl(null);
                    setMediaError(true);
                }
                setMediaLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setResolvedUrl(null);
                setMediaError(true);
                setMediaLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [media]);

    useEffect(() => {
        return () => {
            if (resolvedUrl?.startsWith('blob:')) {
                revokeMediaObjectUrl(resolvedUrl);
            }
        };
    }, [resolvedUrl]);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            setUploadError('Choose an image or video file.');
            return;
        }
        setUploadBusy(true);
        setUploadError(null);
        try {
            const id = await storeMedia(file, file.name);
            onMediaChange(createMediaRef(id));
        } catch {
            setUploadError('Could not store this file.');
        } finally {
            setUploadBusy(false);
        }
    };

    return (
        <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">Media (optional)</span>

            {media && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 p-2 min-h-[120px] flex items-center justify-center">
                    {mediaLoading && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">Loading preview...</span>
                    )}
                    {!mediaLoading && mediaError && (
                        <span className="text-xs text-red-500 dark:text-red-400">Could not load this media.</span>
                    )}
                    {!mediaLoading && !mediaError && resolvedUrl && (
                        <>
                            {isVideoMediaUrl(resolvedUrl) ? (
                                <video
                                    src={resolvedUrl}
                                    controls
                                    className="max-w-full max-h-48 rounded-md border border-slate-200 dark:border-slate-600"
                                    title="Question media preview"
                                >
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <img
                                    src={resolvedUrl}
                                    alt="Question media preview"
                                    className="max-w-full max-h-48 rounded-md border border-slate-200 dark:border-slate-600 object-contain"
                                />
                            )}
                        </>
                    )}
                </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
                <label
                    className={clsx(
                        'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer',
                        uploadBusy
                            ? 'opacity-50 pointer-events-none border-slate-200 dark:border-slate-600'
                            : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                    )}
                >
                    <Upload size={14} />
                    {uploadBusy ? 'Uploading...' : 'Upload file'}
                    <input
                        type="file"
                        accept="image/*,video/*"
                        className="sr-only"
                        disabled={uploadBusy}
                        onChange={handleFile}
                    />
                </label>
                <button
                    type="button"
                    disabled={!media}
                    onClick={() => onMediaChange(undefined)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:pointer-events-none"
                >
                    <Trash2 size={14} />
                    Remove media
                </button>
            </div>
            {uploadError && <p className="text-xs text-red-500 dark:text-red-400">{uploadError}</p>}

            <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    URL, path, or <code className="text-[10px]">idb:...</code> ref (paste to replace upload)
                </label>
                <input
                    type="text"
                    value={media ?? ''}
                    onChange={e => onMediaChange(e.target.value || undefined)}
                    placeholder="https://... or /media/photo.jpg"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                />
            </div>
        </div>
    );
}

function AddQuestionSelect({onPick}: {onPick: (t: QuestionType) => void}) {
    const [value, setValue] = useState<QuestionType | ''>('');
    return (
        <select
            value={value}
            onChange={e => {
                const v = e.target.value as QuestionType | '';
                setValue('');
                if (v) onPick(v);
            }}
            className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
        >
            <option value="">+ Add question...</option>
            {QUESTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                    {t.label}
                </option>
            ))}
        </select>
    );
}

function EditableName({
    initialName,
    onSave,
    placeholder
}: {
    initialName: string;
    onSave: (name: string) => void;
    placeholder: string;
}) {
    const [val, setVal] = useState(initialName);
    return (
        <div className="flex gap-2">
            <input
                type="text"
                value={val}
                onChange={e => setVal(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder={placeholder}
            />
            <button
                type="button"
                onClick={() => {
                    const t = val.trim();
                    if (t) onSave(t);
                }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
                <Save size={16} />
                Save
            </button>
        </div>
    );
}

export const ContentEditor: React.FC = () => {
    const {
        createSubject,
        renameSubject,
        deleteSubject,
        addTopic,
        renameTopic,
        deleteTopic,
        addQuestion,
        updateQuestion,
        deleteQuestion
    } = useQuizStore();

    const settings = useQuizStore(s => s.settings);
    const subjects = useQuizStore(s => s.profiles[s.activeProfileId]?.subjects ?? []);

    const [subjectId, setSubjectId] = useState<string | null>(null);
    const [topicId, setTopicId] = useState<string | null>(null);
    const [questionId, setQuestionId] = useState<string | null>(null);
    const [questionDraft, setQuestionDraft] = useState<Question | null>(null);
    const [questionSaveError, setQuestionSaveError] = useState<string | null>(null);

    const [subjectDeletePending, setSubjectDeletePending] = useState<{id: string; name: string} | null>(null);
    const [topicDeletePending, setTopicDeletePending] = useState<{
        subjectId: string;
        topicId: string;
        topicName: string;
        questionCount: number;
    } | null>(null);
    const [questionDeletePending, setQuestionDeletePending] = useState<{
        subjectId: string;
        topicId: string;
        questionId: string;
    } | null>(null);

    const effectiveSubjectId = useMemo(() => {
        if (subjects.length === 0) return null;
        if (subjectId && subjects.some(s => s.id === subjectId)) return subjectId;
        return subjects[0].id;
    }, [subjects, subjectId]);

    const subject = useMemo(
        () => (effectiveSubjectId ? subjects.find(s => s.id === effectiveSubjectId) ?? null : null),
        [subjects, effectiveSubjectId]
    );

    const effectiveTopicId = useMemo(() => {
        if (!subject) return null;
        if (topicId && subject.topics.some(t => t.id === topicId)) return topicId;
        return subject.topics[0]?.id ?? null;
    }, [subject, topicId]);

    const topic: Topic | null = useMemo(
        () => (effectiveTopicId && subject ? subject.topics.find(t => t.id === effectiveTopicId) ?? null : null),
        [subject, effectiveTopicId]
    );

    const selectedQuestion = useMemo(() => {
        if (!topic || !questionId) return null;
        return topic.questions.find(q => q.id === questionId) ?? null;
    }, [topic, questionId]);

    const saveQuestion = useCallback(() => {
        if (!effectiveSubjectId || !effectiveTopicId || !questionDraft) return;
        const q = {...questionDraft, topicId: effectiveTopicId};
        const validationError = getQuestionDraftError(q);
        if (validationError) {
            setQuestionSaveError(validationError);
            return;
        }
        updateQuestion(effectiveSubjectId, effectiveTopicId, q);
        setQuestionDraft({...q});
        setQuestionSaveError(null);
    }, [effectiveSubjectId, effectiveTopicId, questionDraft, updateQuestion]);

    const handleNewSubject = () => {
        const id = createSubject('New subject');
        setSubjectId(id);
        setTopicId(null);
        setQuestionId(null);
        setQuestionDraft(null);
        setQuestionSaveError(null);
    };

    const clearEditorSelection = () => {
        setTopicId(null);
        setQuestionId(null);
        setQuestionDraft(null);
        setQuestionSaveError(null);
    };

    const handleDeleteSubject = () => {
        if (!effectiveSubjectId || !subject) return;
        if (settings.confirmSubjectDelete) {
            setSubjectDeletePending({id: effectiveSubjectId, name: subject.name});
        } else {
            deleteSubject(effectiveSubjectId);
            clearEditorSelection();
        }
    };

    const handleAddTopic = () => {
        if (!effectiveSubjectId || !subject) return;
        const n = subject.topics.length + 1;
        const tid = addTopic(effectiveSubjectId, `Topic ${n}`);
        setTopicId(tid);
        setQuestionId(null);
        setQuestionDraft(null);
    };

    const handleDeleteTopic = () => {
        if (!effectiveSubjectId || !effectiveTopicId || !topic) return;
        setTopicDeletePending({
            subjectId: effectiveSubjectId,
            topicId: effectiveTopicId,
            topicName: topic.name,
            questionCount: topic.questions.length
        });
    };

    const handleAddQuestion = (type: QuestionType) => {
        if (!effectiveSubjectId || !effectiveTopicId) return;
        const q = createEmptyQuestion(effectiveTopicId, type);
        addQuestion(effectiveSubjectId, effectiveTopicId, q);
        setQuestionId(q.id);
        setQuestionDraft({...q});
        setQuestionSaveError(null);
    };

    const handleDeleteQuestion = () => {
        if (!effectiveSubjectId || !effectiveTopicId || !questionId) return;
        setQuestionDeletePending({
            subjectId: effectiveSubjectId,
            topicId: effectiveTopicId,
            questionId
        });
    };

    const selectQuestion = (q: Question) => {
        setQuestionId(q.id);
        setQuestionDraft({...q});
        setQuestionSaveError(null);
    };

    if (subjects.length === 0) {
        return (
            <div className="space-y-4 animate-in fade-in duration-300">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    No subjects yet. Create one to start editing questions in the app.
                </p>
                <button
                    type="button"
                    onClick={handleNewSubject}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={18} />
                    New subject
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-300 text-sm">
            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Subject
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                        value={effectiveSubjectId ?? ''}
                        onChange={e => {
                            const v = e.target.value;
                            setSubjectId(v || null);
                            setTopicId(null);
                            setQuestionId(null);
                            setQuestionDraft(null);
                            setQuestionSaveError(null);
                        }}
                        className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                        {subjects.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={handleNewSubject}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <Plus size={16} />
                        New
                    </button>
                </div>
                {subject && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex-1 min-w-0">
                            <EditableName
                                key={`sub-${subject.id}-${subject.name}`}
                                initialName={subject.name}
                                onSave={name => effectiveSubjectId && renameSubject(effectiveSubjectId, name)}
                                placeholder="Subject name"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleDeleteSubject}
                            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 sm:self-stretch border border-red-200 dark:border-red-800"
                        >
                            <Trash2 size={16} />
                            Delete subject
                        </button>
                    </div>
                )}
            </div>

            {subject && (
                <>
                    <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <Layers size={14} />
                                Topics
                            </span>
                            <button
                                type="button"
                                onClick={handleAddTopic}
                                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                                Add topic
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {subject.topics.map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                        setTopicId(t.id);
                                        setQuestionId(null);
                                        setQuestionDraft(null);
                                        setQuestionSaveError(null);
                                    }}
                                    className={clsx(
                                        'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                                        t.id === effectiveTopicId
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-indigo-300'
                                    )}
                                >
                                    {t.name}
                                    <span className="opacity-70 ml-1">({t.questions.length})</span>
                                </button>
                            ))}
                        </div>
                        {topic && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <EditableName
                                    key={`top-${topic.id}-${topic.name}`}
                                    initialName={topic.name}
                                    onSave={name => {
                                        if (effectiveSubjectId && effectiveTopicId) {
                                            renameTopic(effectiveSubjectId, effectiveTopicId, name);
                                        }
                                    }}
                                    placeholder="Topic name"
                                />
                                <button
                                    type="button"
                                    onClick={handleDeleteTopic}
                                    className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 sm:self-stretch"
                                >
                                    <Trash2 size={16} />
                                    Delete topic
                                </button>
                            </div>
                        )}
                    </div>

                    {topic && (
                        <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                    <BookOpen size={14} />
                                    Questions
                                </span>
                                <AddQuestionSelect onPick={handleAddQuestion} />
                            </div>
                            <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {topic.questions.length === 0 ? (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                                        No questions yet. Choose a type above.
                                    </p>
                                ) : (
                                    topic.questions.map((q, idx) => (
                                        <button
                                            key={q.id}
                                            type="button"
                                            onClick={() => selectQuestion(q)}
                                            className={clsx(
                                                'w-full text-left px-2 py-1.5 rounded-lg text-xs border transition-colors truncate',
                                                q.id === questionId
                                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-200'
                                                    : 'border-transparent bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-200'
                                            )}
                                        >
                                            <span className="font-mono text-slate-400 mr-1">{idx + 1}.</span>
                                            {q.prompt.slice(0, 80) || '(empty prompt)'}
                                            {q.prompt.length > 80 ? '...' : ''}
                                        </button>
                                    ))
                                )}
                            </div>

                            {questionDraft && selectedQuestion && selectedQuestion.id === questionDraft.id && (
                                <div className="space-y-3 p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50">
                                    <div className="flex flex-wrap gap-2 items-center justify-between">
                                        <label className="text-xs text-slate-500 dark:text-slate-400">Type</label>
                                        <select
                                            value={questionDraft.type}
                                            onChange={e => {
                                                const nt = e.target.value as QuestionType;
                                                if (!effectiveTopicId) return;
                                                setQuestionDraft(migrateQuestionShape(questionDraft, nt, effectiveTopicId));
                                                setQuestionSaveError(null);
                                            }}
                                            className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                                        >
                                            {QUESTION_TYPES.map(t => (
                                                <option key={t.value} value={t.value}>
                                                    {t.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                                            Prompt
                                        </label>
                                        <textarea
                                            value={questionDraft.prompt}
                                            onChange={e => {
                                                setQuestionDraft({...questionDraft, prompt: e.target.value});
                                                setQuestionSaveError(null);
                                            }}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                                            Explanation (optional)
                                        </label>
                                        <textarea
                                            value={questionDraft.explanation ?? ''}
                                            onChange={e =>
                                                setQuestionDraft({
                                                    ...questionDraft,
                                                    explanation: e.target.value || undefined
                                                })
                                            }
                                            rows={2}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
                                        />
                                    </div>

                                    <QuestionMediaEditor
                                        media={questionDraft.media}
                                        onMediaChange={next => {
                                            setQuestionDraft({...questionDraft, media: next});
                                            setQuestionSaveError(null);
                                        }}
                                    />

                                    <QuestionTypeFields
                                        draft={questionDraft}
                                        setDraft={next => {
                                            setQuestionDraft(next);
                                            setQuestionSaveError(null);
                                        }}
                                    />

                                    {questionSaveError && (
                                        <p className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                                            {questionSaveError}
                                        </p>
                                    )}

                                    <div className="flex gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={saveQuestion}
                                            className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                                        >
                                            <Save size={16} />
                                            Save question
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDeleteQuestion}
                                            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            <TypeToConfirmModal
                open={!!subjectDeletePending}
                title="Delete Subject"
                description={(() => {
                    const s = subjectDeletePending
                        ? subjects.find(x => x.id === subjectDeletePending.id)
                        : null;
                    const topicCount = s?.topics.length ?? 0;
                    const questionCount = s
                        ? s.topics.reduce((n, t) => n + t.questions.length, 0)
                        : 0;
                    return (
                        <>
                            This will permanently delete{' '}
                            <strong className="text-slate-900 dark:text-white">
                                {subjectDeletePending?.name}
                            </strong>{' '}
                            ({topicCount} topic(s), {questionCount} question(s)) and all linked progress.
                        </>
                    );
                })()}
                phraseToMatch={subjectDeletePending?.name ?? ''}
                inputPlaceholder="Type subject name..."
                onClose={() => setSubjectDeletePending(null)}
                onConfirm={() => {
                    if (subjectDeletePending) deleteSubject(subjectDeletePending.id);
                    setSubjectDeletePending(null);
                    clearEditorSelection();
                }}
            />

            <SimpleConfirmModal
                open={!!topicDeletePending}
                title="Delete topic?"
                confirmLabel="Delete topic"
                onClose={() => setTopicDeletePending(null)}
                onConfirm={() => {
                    if (!topicDeletePending) return;
                    deleteTopic(topicDeletePending.subjectId, topicDeletePending.topicId);
                    setTopicDeletePending(null);
                    setTopicId(null);
                    setQuestionId(null);
                    setQuestionDraft(null);
                    setQuestionSaveError(null);
                }}
            >
                <p>
                    Delete topic{' '}
                    <strong className="text-slate-900 dark:text-white">{topicDeletePending?.topicName}</strong> and
                    all {topicDeletePending?.questionCount} question(s)? This cannot be undone.
                </p>
            </SimpleConfirmModal>

            <SimpleConfirmModal
                open={!!questionDeletePending}
                title="Delete question?"
                confirmLabel="Delete"
                onClose={() => setQuestionDeletePending(null)}
                onConfirm={() => {
                    if (!questionDeletePending) return;
                    deleteQuestion(
                        questionDeletePending.subjectId,
                        questionDeletePending.topicId,
                        questionDeletePending.questionId
                    );
                    setQuestionDeletePending(null);
                    setQuestionId(null);
                    setQuestionDraft(null);
                    setQuestionSaveError(null);
                }}
            >
                <p>Delete this question? Progress for it will be removed.</p>
            </SimpleConfirmModal>
        </div>
    );
};

function QuestionTypeFields({
    draft,
    setDraft
}: {
    draft: Question;
    setDraft: (q: Question) => void;
}) {
    switch (draft.type) {
        case 'true_false':
            return (
                <div>
                    <span className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Correct answer</span>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                checked={draft.answer === true}
                                onChange={() => setDraft({...draft, answer: true})}
                            />
                            True
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                checked={draft.answer === false}
                                onChange={() => setDraft({...draft, answer: false})}
                            />
                            False
                        </label>
                    </div>
                </div>
            );
        case 'multiple_choice': {
            const canRemoveChoice = draft.choices.length > 2;
            const removeChoice = (removeIdx: number) => {
                if (!canRemoveChoice) return;
                const choices = draft.choices.filter((_, j) => j !== removeIdx);
                let answerIndex = draft.answerIndex;
                if (removeIdx < answerIndex) answerIndex -= 1;
                else if (removeIdx === answerIndex) answerIndex = 0;
                setDraft({
                    ...draft,
                    choices,
                    answerIndex: Math.max(0, Math.min(answerIndex, choices.length - 1))
                });
            };
            return (
                <div className="space-y-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Choices</span>
                    {draft.choices.map((c, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <input
                                type="radio"
                                name={`mc-correct-${draft.id}`}
                                checked={draft.answerIndex === i}
                                onChange={() => setDraft({...draft, answerIndex: i})}
                            />
                            <input
                                type="text"
                                value={c}
                                onChange={e => {
                                    const choices = [...draft.choices];
                                    choices[i] = e.target.value;
                                    setDraft({...draft, choices});
                                }}
                                className="flex-1 min-w-0 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                            />
                            <button
                                type="button"
                                title="Remove choice"
                                disabled={!canRemoveChoice}
                                onClick={() => removeChoice(i)}
                                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:pointer-events-none"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() =>
                            setDraft({...draft, choices: [...draft.choices, ''], answerIndex: draft.choices.length})
                        }
                        className="text-xs text-indigo-600 dark:text-indigo-400"
                    >
                        + Add choice
                    </button>
                </div>
            );
        }
        case 'multiple_answer': {
            const canRemoveChoice = draft.choices.length > 2;
            const removeChoice = (removeIdx: number) => {
                if (!canRemoveChoice) return;
                const choices = draft.choices.filter((_, j) => j !== removeIdx);
                let answerIndices = draft.answerIndices
                    .filter(idx => idx !== removeIdx)
                    .map(idx => (idx > removeIdx ? idx - 1 : idx))
                    .sort((a, b) => a - b);
                if (answerIndices.length === 0) answerIndices = [0];
                setDraft({...draft, choices, answerIndices});
            };
            return (
                <div className="space-y-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Choices (check all correct)</span>
                    {draft.choices.map((c, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <input
                                type="checkbox"
                                checked={draft.answerIndices.includes(i)}
                                onChange={() => {
                                    const set = new Set(draft.answerIndices);
                                    if (set.has(i)) set.delete(i);
                                    else set.add(i);
                                    let answerIndices = [...set].sort((a, b) => a - b);
                                    if (answerIndices.length === 0) {
                                        answerIndices = [0];
                                    }
                                    setDraft({...draft, answerIndices});
                                }}
                            />
                            <input
                                type="text"
                                value={c}
                                onChange={e => {
                                    const choices = [...draft.choices];
                                    choices[i] = e.target.value;
                                    setDraft({...draft, choices});
                                }}
                                className="flex-1 min-w-0 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                            />
                            <button
                                type="button"
                                title="Remove choice"
                                disabled={!canRemoveChoice}
                                onClick={() => removeChoice(i)}
                                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:pointer-events-none"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => setDraft({...draft, choices: [...draft.choices, '']})}
                        className="text-xs text-indigo-600 dark:text-indigo-400"
                    >
                        + Add choice
                    </button>
                </div>
            );
        }
        case 'keywords':
            return (
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Accepted answers (one per line)
                    </label>
                    <textarea
                        value={Array.isArray(draft.answer) ? draft.answer.join('\n') : draft.answer}
                        onChange={e => {
                            const lines = e.target.value
                                .split('\n')
                                .map(l => l.trim())
                                .filter(Boolean);
                            const answer = lines.length <= 1 ? (lines[0] ?? '') : lines;
                            setDraft({...draft, answer});
                        }}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                    />
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                            type="checkbox"
                            checked={draft.caseSensitive ?? false}
                            onChange={e => setDraft({...draft, caseSensitive: e.target.checked})}
                        />
                        Case sensitive
                    </label>
                </div>
            );
        case 'matching':
            return (
                <div className="space-y-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Pairs</span>
                    {draft.pairs.map((p, i) => (
                        <div key={i} className="flex flex-wrap gap-2">
                            <input
                                type="text"
                                placeholder="Left"
                                value={p.left}
                                onChange={e => {
                                    const pairs = [...draft.pairs];
                                    pairs[i] = {...pairs[i], left: e.target.value};
                                    setDraft({...draft, pairs});
                                }}
                                className="flex-1 min-w-[calc(50%-2rem)] px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                            />
                            <input
                                type="text"
                                placeholder="Right"
                                value={p.right}
                                onChange={e => {
                                    const pairs = [...draft.pairs];
                                    pairs[i] = {...pairs[i], right: e.target.value};
                                    setDraft({...draft, pairs});
                                }}
                                className="flex-1 min-w-[calc(50%-2rem)] px-2 py-1.5 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                            />
                            <button
                                type="button"
                                title="Remove pair"
                                onClick={() => {
                                    const pairs = draft.pairs.filter((_, j) => j !== i);
                                    setDraft({...draft, pairs: pairs.length ? pairs : [{left: '', right: ''}]});
                                }}
                                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => setDraft({...draft, pairs: [...draft.pairs, {left: '', right: ''}]})}
                        className="text-xs text-indigo-600 dark:text-indigo-400"
                    >
                        + Add pair
                    </button>
                </div>
            );
        case 'word_bank':
            return (
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Sentence (use _ for each blank)
                    </label>
                    <textarea
                        value={draft.sentence}
                        onChange={e => setDraft({...draft, sentence: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                    />
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Word bank (comma-separated)
                    </label>
                    <input
                        type="text"
                        value={draft.wordBank.join(', ')}
                        onChange={e => {
                            const wordBank = e.target.value
                                .split(',')
                                .map(s => s.trim())
                                .filter(Boolean);
                            setDraft({...draft, wordBank: wordBank.length ? wordBank : ['']});
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                    />
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Correct words in blank order (comma-separated)
                    </label>
                    <input
                        type="text"
                        value={draft.answers.join(', ')}
                        onChange={e => {
                            const answers = e.target.value
                                .split(',')
                                .map(s => s.trim())
                                .filter(Boolean);
                            setDraft({...draft, answers: answers.length ? answers : ['']});
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                    />
                </div>
            );
    }
}
