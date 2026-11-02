import React, {useId, useState} from 'react';
import {clsx} from 'clsx';
import {BookOpen, Layers, Plus, Save, Trash2} from 'lucide-react';
import {useQuizStore} from '../store/useQuizStore';
import type {Question, QuestionType, Subject, Topic} from '../types';
import {QUESTION_TYPES, createEmptyQuestion, getQuestionDraftError, migrateQuestionShape} from '../utils/contentEditor';
import {plural} from '../utils/plural';
import {SimpleConfirmModal, TypeToConfirmModal} from './AppModals';
import {EditableName} from './contentEditor/EditableName';
import {QuestionMediaEditor} from './contentEditor/QuestionMediaEditor';
import {QuestionTypeFields} from './contentEditor/QuestionTypeFields';
import {
    DELETE_BUTTON_CLASS,
    FIELD_CLASS,
    FIELD_LABEL_CLASS,
    SECTION_LABEL_CLASS,
    SMALL_SELECT_CLASS
} from './contentEditor/fieldStyles';

function AddQuestionSelect({onPick}: {onPick: (type: QuestionType) => void}) {
    return (
        <select
            // Always shows the prompt; picking a type adds a question of that type
            value=""
            onChange={(event) => {
                const type = event.target.value as QuestionType | '';
                if (type) onPick(type);
            }}
            aria-label="Add question"
            className={SMALL_SELECT_CLASS}
        >
            <option value="">+ Add question...</option>
            {QUESTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                    {type.label}
                </option>
            ))}
        </select>
    );
}

/**
 * Create, rename, and delete subjects and topics, and write their questions.
 */
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

    const settings = useQuizStore((s) => s.settings);
    const subjects = useQuizStore((s) => s.profiles[s.activeProfileId]?.subjects ?? []);
    const subjectSelectId = useId();
    const typeSelectId = useId();
    const promptId = useId();
    const explanationId = useId();

    // The chosen subject and topic. When unset, or deleted, the first one is shown.
    const [subjectId, setSubjectId] = useState<string | null>(null);
    const [topicId, setTopicId] = useState<string | null>(null);
    const [questionId, setQuestionId] = useState<string | null>(null);
    // Edits to the open question, which are only stored when saved
    const [questionDraft, setQuestionDraft] = useState<Question | null>(null);
    const [questionSaveError, setQuestionSaveError] = useState<string | null>(null);

    const [subjectDeletePending, setSubjectDeletePending] = useState<Subject | null>(null);
    const [topicDeletePending, setTopicDeletePending] = useState<{subjectId: string; topic: Topic} | null>(null);
    const [questionDeletePending, setQuestionDeletePending] = useState<{
        subjectId: string;
        topicId: string;
        questionId: string;
    } | null>(null);

    const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];
    const topic = subject?.topics.find((t) => t.id === topicId) ?? subject?.topics[0];
    const selectedQuestion = topic?.questions.find((q) => q.id === questionId);

    const closeQuestion = () => {
        setQuestionId(null);
        setQuestionDraft(null);
        setQuestionSaveError(null);
    };

    const openQuestion = (question: Question) => {
        setQuestionId(question.id);
        setQuestionDraft({...question});
        setQuestionSaveError(null);
    };

    /** Show a topic, or the subject's first topic when null. */
    const selectTopic = (id: string | null) => {
        setTopicId(id);
        closeQuestion();
    };

    /** Show a subject, or the first subject when null. */
    const selectSubject = (id: string | null) => {
        setSubjectId(id);
        selectTopic(null);
    };

    const updateDraft = (next: Question) => {
        setQuestionDraft(next);
        setQuestionSaveError(null);
    };

    if (!subject) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    No subjects yet. Create one to start editing questions in the app.
                </p>
                <button
                    type="button"
                    onClick={() => selectSubject(createSubject('New subject'))}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                >
                    <Plus size={18} />
                    New subject
                </button>
            </div>
        );
    }

    const saveQuestion = () => {
        if (!topic || !questionDraft) return;
        const question = {...questionDraft, topicId: topic.id};
        const validationError = getQuestionDraftError(question);
        if (validationError) {
            setQuestionSaveError(validationError);
            return;
        }
        updateQuestion(subject.id, topic.id, question);
        setQuestionDraft(question);
    };

    const handleDeleteSubject = () => {
        if (settings.confirmSubjectDelete) {
            setSubjectDeletePending(subject);
        } else {
            deleteSubject(subject.id);
            selectTopic(null);
        }
    };

    const handleAddQuestion = (type: QuestionType) => {
        if (!topic) return;
        const question = createEmptyQuestion(topic.id, type);
        addQuestion(subject.id, topic.id, question);
        openQuestion(question);
    };

    const pendingQuestionCount = subjectDeletePending?.topics.reduce((n, t) => n + t.questions.length, 0) ?? 0;

    return (
        <div className="space-y-4 text-sm">
            <div className="space-y-2">
                <label htmlFor={subjectSelectId} className={SECTION_LABEL_CLASS}>
                    Subject
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                        id={subjectSelectId}
                        value={subject.id}
                        onChange={(event) => selectSubject(event.target.value || null)}
                        className={`flex-1 min-w-0 ${FIELD_CLASS}`}
                    >
                        {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => selectSubject(createSubject('New subject'))}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <Plus size={16} />
                        New
                    </button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex-1 min-w-0">
                        <EditableName
                            key={`sub-${subject.id}-${subject.name}`}
                            initialName={subject.name}
                            onSave={(name) => renameSubject(subject.id, name)}
                            label="Subject name"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleDeleteSubject}
                        className={`${DELETE_BUTTON_CLASS} sm:self-stretch`}
                    >
                        <Trash2 size={16} />
                        Delete subject
                    </button>
                </div>
            </div>

            <div className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="flex items-center justify-between gap-2">
                    <span className={SECTION_LABEL_CLASS}>
                        <Layers size={14} />
                        Topics
                    </span>
                    <button
                        type="button"
                        onClick={() => selectTopic(addTopic(subject.id, `Topic ${subject.topics.length + 1}`))}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        Add topic
                    </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {subject.topics.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => selectTopic(t.id)}
                            aria-pressed={t.id === topic?.id}
                            className={clsx(
                                'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                                t.id === topic?.id
                                    ? 'bg-indigo-600 text-on-accent border-indigo-600'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:border-indigo-300'
                            )}
                        >
                            {t.name}
                            <span className="opacity-90 ml-1">({t.questions.length})</span>
                        </button>
                    ))}
                </div>
                {topic && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="flex-1 min-w-0">
                            <EditableName
                                key={`top-${topic.id}-${topic.name}`}
                                initialName={topic.name}
                                onSave={(name) => renameTopic(subject.id, topic.id, name)}
                                label="Topic name"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setTopicDeletePending({subjectId: subject.id, topic})}
                            className={`${DELETE_BUTTON_CLASS} sm:self-stretch`}
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
                        <span className={SECTION_LABEL_CLASS}>
                            <BookOpen size={14} />
                            Questions
                        </span>
                        <AddQuestionSelect onPick={handleAddQuestion} />
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {topic.questions.length === 0 ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                                No questions yet. Choose a type above.
                            </p>
                        ) : (
                            topic.questions.map((q, idx) => (
                                <button
                                    key={q.id}
                                    type="button"
                                    onClick={() => openQuestion(q)}
                                    aria-pressed={q.id === questionId}
                                    className={clsx(
                                        'w-full text-left px-2 py-1.5 rounded-lg text-xs border transition-colors truncate',
                                        q.id === questionId
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-200'
                                            : 'border-transparent bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-200'
                                    )}
                                >
                                    <span className="font-mono text-slate-500 dark:text-slate-400 mr-1">
                                        {idx + 1}.
                                    </span>
                                    {q.prompt || '(empty prompt)'}
                                </button>
                            ))
                        )}
                    </div>

                    {questionDraft && selectedQuestion && (
                        <div className="space-y-3 p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50">
                            <div className="flex flex-wrap gap-2 items-center justify-between">
                                <label htmlFor={typeSelectId} className="text-xs text-slate-500 dark:text-slate-400">
                                    Type
                                </label>
                                <select
                                    id={typeSelectId}
                                    value={questionDraft.type}
                                    onChange={(event) =>
                                        updateDraft(
                                            migrateQuestionShape(
                                                questionDraft,
                                                event.target.value as QuestionType,
                                                topic.id
                                            )
                                        )
                                    }
                                    className={SMALL_SELECT_CLASS}
                                >
                                    {QUESTION_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor={promptId} className={FIELD_LABEL_CLASS}>
                                    Prompt
                                </label>
                                <textarea
                                    id={promptId}
                                    value={questionDraft.prompt}
                                    onChange={(event) => updateDraft({...questionDraft, prompt: event.target.value})}
                                    rows={3}
                                    className={FIELD_CLASS}
                                />
                            </div>

                            <div>
                                <label htmlFor={explanationId} className={FIELD_LABEL_CLASS}>
                                    Explanation (optional)
                                </label>
                                <textarea
                                    id={explanationId}
                                    value={questionDraft.explanation ?? ''}
                                    onChange={(event) =>
                                        updateDraft({
                                            ...questionDraft,
                                            explanation: event.target.value || undefined
                                        })
                                    }
                                    rows={2}
                                    className={FIELD_CLASS}
                                />
                            </div>

                            <QuestionMediaEditor
                                media={questionDraft.media}
                                onMediaChange={(media) => updateDraft({...questionDraft, media})}
                            />

                            <QuestionTypeFields draft={questionDraft} setDraft={updateDraft} />

                            {questionSaveError && (
                                <p
                                    role="alert"
                                    className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-400"
                                >
                                    {questionSaveError}
                                </p>
                            )}

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={saveQuestion}
                                    className="btn-primary flex-1 inline-flex items-center justify-center gap-1 text-sm"
                                >
                                    <Save size={16} />
                                    Save question
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setQuestionDeletePending({
                                            subjectId: subject.id,
                                            topicId: topic.id,
                                            questionId: selectedQuestion.id
                                        })
                                    }
                                    className={DELETE_BUTTON_CLASS}
                                    aria-label="Delete selected question"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <TypeToConfirmModal
                open={!!subjectDeletePending}
                title="Delete subject"
                description={
                    <>
                        This will permanently delete{' '}
                        <strong className="text-slate-900 dark:text-white">{subjectDeletePending?.name}</strong> (
                        {plural(subjectDeletePending?.topics.length ?? 0, 'topic')},{' '}
                        {plural(pendingQuestionCount, 'question')}) and all linked progress.
                    </>
                }
                phraseToMatch={subjectDeletePending?.name ?? ''}
                inputPlaceholder="Type subject name..."
                onClose={() => setSubjectDeletePending(null)}
                onConfirm={() => {
                    if (subjectDeletePending) deleteSubject(subjectDeletePending.id);
                    setSubjectDeletePending(null);
                    selectTopic(null);
                }}
            />

            <SimpleConfirmModal
                open={!!topicDeletePending}
                title="Delete topic?"
                confirmLabel="Delete topic"
                onClose={() => setTopicDeletePending(null)}
                onConfirm={() => {
                    if (!topicDeletePending) return;
                    deleteTopic(topicDeletePending.subjectId, topicDeletePending.topic.id);
                    setTopicDeletePending(null);
                    selectTopic(null);
                }}
            >
                <p>
                    Delete topic{' '}
                    <strong className="text-slate-900 dark:text-white">{topicDeletePending?.topic.name}</strong> and its{' '}
                    {plural(topicDeletePending?.topic.questions.length ?? 0, 'question')}? This cannot be undone.
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
                    closeQuestion();
                }}
            >
                <p>Delete this question? Progress for it will be removed.</p>
            </SimpleConfirmModal>
        </div>
    );
};
