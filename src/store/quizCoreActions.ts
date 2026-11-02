import {v4 as uuidv4} from 'uuid';
import type {Profile, ProgressMap, QuestionProgress, SessionState, Subject, Topic} from '../types';
import {sanitizeSubjectProgress, validateSubjects} from '../utils/importValidation';
import {checkAnswer, randomRequeueInsertIndex} from '../utils/quizLogic';
import {
    cleanupOrphanedMedia,
    endSession,
    getCurrentProfile,
    getCurrentSubject,
    mediaIdsIn,
    mergeSubjectProgress,
    mergeSubjectsIntoList,
    questionsIn,
    rebuildSessionForSubjectIfActive,
    reconcileProfileStateForSubjects,
    withFreshQueue,
    type SetQuizState
} from './quizStoreHelpers';
import type {QuizState} from './useQuizStore';

/** The state change that applies `changes` to the active profile. */
function updateActiveProfile(state: QuizState, changes: Partial<Profile>): Partial<QuizState> {
    return {
        profiles: {
            ...state.profiles,
            [state.activeProfileId]: {...getCurrentProfile(state), ...changes}
        }
    };
}

/**
 * The profile changes for new subjects or progress. When the changed subject is the one being
 * studied, its queue is rebuilt to match.
 */
function withSubjectChanges(
    profile: Profile,
    subjectId: string,
    {subjects = profile.subjects, progress = profile.progress}: Partial<Pick<Profile, 'subjects' | 'progress'>>
): Pick<Profile, 'subjects' | 'progress' | 'session'> {
    return {
        subjects,
        progress,
        session: rebuildSessionForSubjectIfActive(profile, subjectId, subjects, progress[subjectId])
    };
}

function updateSubject(subjects: Subject[], subjectId: string, update: (subject: Subject) => Subject): Subject[] {
    return subjects.map((subject) => (subject.id === subjectId ? update(subject) : subject));
}

function updateTopic(
    subjects: Subject[],
    subjectId: string,
    topicId: string,
    update: (topic: Topic) => Topic
): Subject[] {
    return updateSubject(subjects, subjectId, (subject) => ({
        ...subject,
        topics: subject.topics.map((topic) => (topic.id === topicId ? update(topic) : topic))
    }));
}

function findTopic(profile: Profile, subjectId: string, topicId: string): Topic | undefined {
    return profile.subjects.find((s) => s.id === subjectId)?.topics.find((t) => t.id === topicId);
}

function findQuestion(subject: Subject, questionId: string) {
    for (const topic of subject.topics) {
        const question = topic.questions.find((q) => q.id === questionId);
        if (question) return {question, topicId: topic.id};
    }
    return undefined;
}

/** A copy of `record` without `key`. */
function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
    const copy = {...record};
    delete copy[key];
    return copy;
}

/** A copy of `record` with `key` set to `value`, or removed when `value` has no entries. */
function setOrOmit<T extends object>(record: Record<string, T>, key: string, value: T): Record<string, T> {
    return Object.keys(value).length > 0 ? {...record, [key]: value} : omitKey(record, key);
}

/** The progress map after one attempt at a question. */
function recordAttempt(
    progress: ProgressMap,
    subjectId: string,
    topicId: string,
    questionId: string,
    correct: boolean
): ProgressMap {
    const subjectProgress = progress[subjectId] ?? {};
    const topicProgress = subjectProgress[topicId] ?? {};
    const previous: QuestionProgress = topicProgress[questionId] ?? {
        id: questionId,
        correctStreak: 0,
        attempts: 0,
        mastered: false
    };
    return {
        ...progress,
        [subjectId]: {
            ...subjectProgress,
            [topicId]: {
                ...topicProgress,
                [questionId]: {
                    ...previous,
                    attempts: previous.attempts + 1,
                    correctStreak: correct ? previous.correctStreak + 1 : 0,
                    mastered: correct
                }
            }
        }
    };
}

/** The queue with the question put back in, a random number of places ahead within the configured gap. */
function requeue(queue: string[], questionId: string, settings: QuizState['settings']): string[] {
    const index = randomRequeueInsertIndex(queue.length, settings.quizRequeueGapMin, settings.quizRequeueGapMax);
    return [...queue.slice(0, index), questionId, ...queue.slice(index)];
}

/** The session moved on to the first question in `queue`. */
function advance(session: SessionState, queue: string[]): SessionState {
    const [currentQuestionId = null, ...rest] = queue;
    return {...session, queue: rest, currentQuestionId, turnCounter: session.turnCounter + 1};
}

/**
 * The state change that applies `changes` to the session, then refills the queue when a
 * subject is being studied.
 */
function updateSession(state: QuizState, changes: Partial<SessionState>): Partial<QuizState> {
    const profile = getCurrentProfile(state);
    const session = {...profile.session, ...changes};
    const subject = profile.subjects.find((s) => s.id === session.subjectId);
    return updateActiveProfile(state, {
        session: subject ? withFreshQueue(session, subject, profile.progress[subject.id]) : session
    });
}

export function createQuizCoreActions(
    set: SetQuizState,
    get: () => QuizState
): Pick<
    QuizState,
    | 'setSubjects'
    | 'importSubjects'
    | 'importSubjectExport'
    | 'resetTopicProgress'
    | 'markTopicMastered'
    | 'deleteSubject'
    | 'createSubject'
    | 'renameSubject'
    | 'addTopic'
    | 'renameTopic'
    | 'deleteTopic'
    | 'addQuestion'
    | 'updateQuestion'
    | 'deleteQuestion'
    | 'startSession'
    | 'toggleTopic'
    | 'selectAllTopics'
    | 'setMode'
    | 'setIncludeMastered'
    | 'restartQueue'
    | 'submitAnswer'
    | 'nextQuestion'
    | 'skipQuestion'
    | 'resetSubjectProgress'
> {
    const activeProfileMediaIds = () => mediaIdsIn(questionsIn(getCurrentProfile(get()).subjects));

    return {
        setSubjects: (subjects) =>
            set((state) =>
                updateActiveProfile(state, {
                    subjects,
                    ...reconcileProfileStateForSubjects(getCurrentProfile(state), subjects)
                })
            ),

        importSubjects: (newSubjects) => {
            const mediaBefore = activeProfileMediaIds();
            set((state) => {
                const profile = getCurrentProfile(state);
                const subjects = mergeSubjectsIntoList(profile.subjects, newSubjects);
                return updateActiveProfile(state, {
                    subjects,
                    ...reconcileProfileStateForSubjects(profile, subjects)
                });
            });
            cleanupOrphanedMedia(mediaBefore, get);
        },

        importSubjectExport: (bundle) => {
            const [subject] = validateSubjects([bundle.subject]);
            const mediaBefore = activeProfileMediaIds();
            set((state) => {
                const profile = getCurrentProfile(state);
                const subjectProgress = mergeSubjectProgress(
                    profile.progress[subject.id] ?? {},
                    sanitizeSubjectProgress(bundle.progress, subject)
                );
                return updateActiveProfile(
                    state,
                    withSubjectChanges(profile, subject.id, {
                        subjects: mergeSubjectsIntoList(profile.subjects, [subject]),
                        progress: setOrOmit(profile.progress, subject.id, subjectProgress)
                    })
                );
            });
            cleanupOrphanedMedia(mediaBefore, get);
        },

        resetTopicProgress: (subjectId, topicId) =>
            set((state) => {
                const profile = getCurrentProfile(state);
                const subjectProgress = omitKey(profile.progress[subjectId] ?? {}, topicId);
                return updateActiveProfile(
                    state,
                    withSubjectChanges(profile, subjectId, {
                        progress: setOrOmit(profile.progress, subjectId, subjectProgress)
                    })
                );
            }),

        markTopicMastered: (subjectId, topicId) =>
            set((state) => {
                const profile = getCurrentProfile(state);
                const topic = findTopic(profile, subjectId, topicId);
                if (!topic) return state;

                const topicProgress = {...profile.progress[subjectId]?.[topicId]};
                for (const question of topic.questions) {
                    topicProgress[question.id] = {id: question.id, attempts: 1, correctStreak: 1, mastered: true};
                }
                return updateActiveProfile(
                    state,
                    withSubjectChanges(profile, subjectId, {
                        progress: {
                            ...profile.progress,
                            [subjectId]: {...profile.progress[subjectId], [topicId]: topicProgress}
                        }
                    })
                );
            }),

        deleteSubject: (subjectId) => {
            const mediaToCheck = mediaIdsIn(
                questionsIn(getCurrentProfile(get()).subjects.filter((s) => s.id === subjectId))
            );

            set((state) => {
                const profile = getCurrentProfile(state);
                return updateActiveProfile(state, {
                    subjects: profile.subjects.filter((s) => s.id !== subjectId),
                    progress: omitKey(profile.progress, subjectId),
                    session: profile.session.subjectId === subjectId ? endSession(profile.session) : profile.session
                });
            });
            cleanupOrphanedMedia(mediaToCheck, get);
        },

        createSubject: (name) => {
            const subject: Subject = {
                id: uuidv4(),
                name: name.trim() || 'New subject',
                topics: [{id: uuidv4(), name: 'Topic 1', questions: []}]
            };
            set((state) => updateActiveProfile(state, {subjects: [...getCurrentProfile(state).subjects, subject]}));
            return subject.id;
        },

        renameSubject: (subjectId, name) => {
            const trimmed = name.trim();
            if (!trimmed) return;
            set((state) =>
                updateActiveProfile(state, {
                    subjects: updateSubject(getCurrentProfile(state).subjects, subjectId, (subject) => ({
                        ...subject,
                        name: trimmed
                    }))
                })
            );
        },

        addTopic: (subjectId, name) => {
            const topic: Topic = {id: uuidv4(), name: name.trim() || 'New topic', questions: []};
            set((state) => {
                const profile = getCurrentProfile(state);
                const subjects = updateSubject(profile.subjects, subjectId, (subject) => ({
                    ...subject,
                    topics: [...subject.topics, topic]
                }));
                return updateActiveProfile(state, withSubjectChanges(profile, subjectId, {subjects}));
            });
            return topic.id;
        },

        renameTopic: (subjectId, topicId, name) => {
            const trimmed = name.trim();
            if (!trimmed) return;
            set((state) =>
                updateActiveProfile(state, {
                    subjects: updateTopic(getCurrentProfile(state).subjects, subjectId, topicId, (topic) => ({
                        ...topic,
                        name: trimmed
                    }))
                })
            );
        },

        deleteTopic: (subjectId, topicId) => {
            const mediaToCheck = mediaIdsIn(findTopic(getCurrentProfile(get()), subjectId, topicId)?.questions ?? []);

            set((state) => {
                const profile = getCurrentProfile(state);
                if (!profile.subjects.some((s) => s.id === subjectId)) return state;

                const subjects = updateSubject(profile.subjects, subjectId, (subject) => ({
                    ...subject,
                    topics: subject.topics.filter((t) => t.id !== topicId)
                }));
                const subjectProgress = omitKey(profile.progress[subjectId] ?? {}, topicId);
                const selectedTopicIds = profile.session.selectedTopicIds.filter((id) => id !== topicId);
                return updateActiveProfile(
                    state,
                    withSubjectChanges({...profile, session: {...profile.session, selectedTopicIds}}, subjectId, {
                        subjects,
                        progress: setOrOmit(profile.progress, subjectId, subjectProgress)
                    })
                );
            });
            cleanupOrphanedMedia(mediaToCheck, get);
        },

        addQuestion: (subjectId, topicId, question) =>
            set((state) => {
                const profile = getCurrentProfile(state);
                const subjects = updateTopic(profile.subjects, subjectId, topicId, (topic) => ({
                    ...topic,
                    questions: [...topic.questions, question]
                }));
                return updateActiveProfile(state, withSubjectChanges(profile, subjectId, {subjects}));
            }),

        updateQuestion: (subjectId, topicId, question) => {
            const previous = findTopic(getCurrentProfile(get()), subjectId, topicId)?.questions.find(
                (q) => q.id === question.id
            );
            const mediaToCheck = mediaIdsIn(previous ? [previous] : []);

            set((state) => {
                const profile = getCurrentProfile(state);
                const subjects = updateTopic(profile.subjects, subjectId, topicId, (topic) => ({
                    ...topic,
                    questions: topic.questions.map((q) => (q.id === question.id ? question : q))
                }));
                return updateActiveProfile(state, withSubjectChanges(profile, subjectId, {subjects}));
            });
            cleanupOrphanedMedia(mediaToCheck, get);
        },

        deleteQuestion: (subjectId, topicId, questionId) => {
            const question = findTopic(getCurrentProfile(get()), subjectId, topicId)?.questions.find(
                (q) => q.id === questionId
            );
            const mediaToCheck = mediaIdsIn(question ? [question] : []);

            set((state) => {
                const profile = getCurrentProfile(state);
                const subjects = updateTopic(profile.subjects, subjectId, topicId, (topic) => ({
                    ...topic,
                    questions: topic.questions.filter((q) => q.id !== questionId)
                }));
                const subjectProgress = profile.progress[subjectId] ?? {};
                const topicProgress = omitKey(subjectProgress[topicId] ?? {}, questionId);
                const progress = setOrOmit(
                    profile.progress,
                    subjectId,
                    setOrOmit(subjectProgress, topicId, topicProgress)
                );
                return updateActiveProfile(state, withSubjectChanges(profile, subjectId, {subjects, progress}));
            });
            cleanupOrphanedMedia(mediaToCheck, get);
        },

        startSession: (subjectId) =>
            set((state) =>
                getCurrentProfile(state).subjects.some((s) => s.id === subjectId)
                    ? updateSession(state, {subjectId, selectedTopicIds: []})
                    : state
            ),

        toggleTopic: (topicId) =>
            set((state) => {
                const subject = getCurrentSubject(state);
                if (!subject) return state;

                const selected = getCurrentProfile(state).session.selectedTopicIds;
                const selectedTopicIds = selected.includes(topicId)
                    ? selected.filter((id) => id !== topicId)
                    : [...selected, topicId];
                // An empty selection means every topic
                return updateSession(state, {
                    selectedTopicIds: selectedTopicIds.length === subject.topics.length ? [] : selectedTopicIds
                });
            }),

        selectAllTopics: () =>
            set((state) => (getCurrentSubject(state) ? updateSession(state, {selectedTopicIds: []}) : state)),

        setMode: (mode) => set((state) => updateSession(state, {mode})),

        setIncludeMastered: (include) => set((state) => updateSession(state, {includeMastered: include})),

        restartQueue: () => set((state) => (getCurrentSubject(state) ? updateSession(state, {}) : state)),

        submitAnswer: (answer) => {
            const stateBefore = get();
            const subject = getCurrentSubject(stateBefore);
            const questionId = getCurrentProfile(stateBefore).session.currentQuestionId;
            if (!subject || !questionId) return {correct: false};
            const found = findQuestion(subject, questionId);
            if (!found) return {correct: false};

            const correct = checkAnswer(found.question, answer);
            set((state) => {
                const profile = getCurrentProfile(state);
                const {queue} = profile.session;
                return updateActiveProfile(state, {
                    progress: recordAttempt(profile.progress, subject.id, found.topicId, questionId, correct),
                    session: {
                        ...profile.session,
                        queue:
                            !correct && state.settings.quizRequeueOnIncorrect
                                ? requeue(queue, questionId, state.settings)
                                : queue
                    }
                });
            });
            return {correct, explanation: found.question.explanation};
        },

        nextQuestion: () =>
            set((state) => {
                const {session} = getCurrentProfile(state);
                return updateActiveProfile(state, {session: advance(session, session.queue)});
            }),

        skipQuestion: () => {
            const stateBefore = get();
            const subject = getCurrentSubject(stateBefore);
            const questionId = getCurrentProfile(stateBefore).session.currentQuestionId;
            if (!subject || !questionId) return;
            const found = findQuestion(subject, questionId);
            if (!found) return;

            set((state) => {
                const profile = getCurrentProfile(state);
                const {session} = profile;
                const queue = state.settings.quizRequeueOnSkip
                    ? requeue(session.queue, questionId, state.settings)
                    : session.queue;
                return updateActiveProfile(state, {
                    progress: recordAttempt(profile.progress, subject.id, found.topicId, questionId, false),
                    session: advance(session, queue)
                });
            });
        },

        resetSubjectProgress: (subjectId) =>
            set((state) => {
                const profile = getCurrentProfile(state);
                return updateActiveProfile(
                    state,
                    withSubjectChanges(profile, subjectId, {progress: omitKey(profile.progress, subjectId)})
                );
            })
    };
}
