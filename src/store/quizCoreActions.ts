import type {Profile, Question, QuestionProgress, SessionState, Subject} from '../types';
import {sanitizeSubjectProgress, validateSubjects} from '../utils/importValidation';
import {
    checkAnswer,
    generateQueue,
    getActiveQuestions,
    randomRequeueInsertIndex
} from '../utils/quizLogic';
import type {QuizState} from './useQuizStore';

type SetState = (
    partial: QuizState | Partial<QuizState> | ((state: QuizState) => QuizState | Partial<QuizState>)
) => void;

type CreateQuizCoreActionsParams = {
    set: SetState;
    get: () => QuizState;
    createId: () => string;
    getCurrentProfile: (state: QuizState) => Profile;
    getCurrentSubject: (state: QuizState) => Subject | undefined;
    mergeSubjectsIntoList: (existing: Subject[], incoming: Subject[]) => Subject[];
    rebuildSessionForSubjectIfActive: (
        profile: Profile,
        subjectId: string,
        mergedSubjects: Subject[],
        subjectProgressSlice: Record<string, Record<string, QuestionProgress>> | undefined
    ) => SessionState;
    flattenProgress: (
        subjectProgress: Record<string, Record<string, QuestionProgress>> | undefined
    ) => Record<string, QuestionProgress>;
    extractMediaIdsFromQuestion: (question: Question) => Set<string>;
    extractMediaIdsFromTopic: (topic: Subject['topics'][number]) => Set<string>;
    extractMediaIdsFromSubject: (subject: Subject) => Set<string>;
    cleanupOrphanedMedia: (mediaToCheck: Set<string>, getState: () => QuizState) => void;
    reconcileProfileStateForSubjects: (profile: Profile, subjects: Subject[]) => Pick<Profile, 'progress' | 'session'>;
};

export function createQuizCoreActions({
    set,
    get,
    createId,
    getCurrentProfile,
    getCurrentSubject,
    mergeSubjectsIntoList,
    rebuildSessionForSubjectIfActive,
    flattenProgress,
    extractMediaIdsFromQuestion,
    extractMediaIdsFromTopic,
    extractMediaIdsFromSubject,
    cleanupOrphanedMedia,
    reconcileProfileStateForSubjects
}: CreateQuizCoreActionsParams): Pick<
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
    return {
        setSubjects: (subjects) => set((state) => {
            const profile = getCurrentProfile(state);
            const reconciled = reconcileProfileStateForSubjects(profile, subjects);
            return {
                profiles: {
                    ...state.profiles,
                    [state.activeProfileId]: {
                        ...profile,
                        subjects,
                        progress: reconciled.progress,
                        session: reconciled.session
                    }
                }
            };
        }),

        importSubjects: (newSubjects) => set((state) => {
            const profile = getCurrentProfile(state);
            const mergedSubjects = mergeSubjectsIntoList(profile.subjects, newSubjects);
            const reconciled = reconcileProfileStateForSubjects(profile, mergedSubjects);

            return {
                profiles: {
                    ...state.profiles,
                    [state.activeProfileId]: {
                        ...profile,
                        subjects: mergedSubjects,
                        progress: reconciled.progress,
                        session: reconciled.session
                    }
                }
            };
        }),

        importSubjectExport: (bundle) => {
            const validated = validateSubjects([bundle.subject]);
            set((state) => {
                const profile = getCurrentProfile(state);
                const mergedSubjects = mergeSubjectsIntoList(profile.subjects, validated);
                const sid = validated[0].id;
                const prevSlice = profile.progress[sid] || {};
                const mergedSlice: Record<string, Record<string, QuestionProgress>> = {...prevSlice};
                const validProgress = sanitizeSubjectProgress(bundle.progress, validated[0]);
                for (const [topicId, qMap] of Object.entries(validProgress)) {
                    mergedSlice[topicId] = {...(mergedSlice[topicId] || {}), ...qMap};
                }
                const newProgress: Profile['progress'] = {...profile.progress};
                if (Object.keys(mergedSlice).length > 0) {
                    newProgress[sid] = mergedSlice;
                }
                const newSession = rebuildSessionForSubjectIfActive(profile, sid, mergedSubjects, newProgress[sid]);

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            subjects: mergedSubjects,
                            progress: newProgress,
                            session: newSession
                        }
                    }
                };
            });
        },

        resetTopicProgress: (subjectId, topicId) => {
            set((state) => {
                const profile = getCurrentProfile(state);
                const subjSlice = {...(profile.progress[subjectId] || {})};
                delete subjSlice[topicId];
                const newProgress = {...profile.progress};
                if (Object.keys(subjSlice).length === 0) {
                    delete newProgress[subjectId];
                } else {
                    newProgress[subjectId] = subjSlice;
                }
                const mergedSubjects = profile.subjects;
                const sliceForSession = newProgress[subjectId];
                const newSession = rebuildSessionForSubjectIfActive(
                    profile,
                    subjectId,
                    mergedSubjects,
                    sliceForSession
                );

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            progress: newProgress,
                            session: newSession
                        }
                    }
                };
            });
        },

        markTopicMastered: (subjectId, topicId) => {
            set((state) => {
                const profile = getCurrentProfile(state);
                const subject = profile.subjects.find(s => s.id === subjectId);
                if (!subject) return state;
                const topic = subject.topics.find(t => t.id === topicId);
                if (!topic) return state;

                const subjSlice = {...(profile.progress[subjectId] || {})};
                const topicSlice = {...(subjSlice[topicId] || {})};
                for (const q of topic.questions) {
                    topicSlice[q.id] = {
                        id: q.id,
                        attempts: 1,
                        correctStreak: 1,
                        mastered: true
                    };
                }
                subjSlice[topicId] = topicSlice;
                const newProgress = {...profile.progress, [subjectId]: subjSlice};
                const newSession = rebuildSessionForSubjectIfActive(
                    profile,
                    subjectId,
                    profile.subjects,
                    subjSlice
                );

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            progress: newProgress,
                            session: newSession
                        }
                    }
                };
            });
        },

        deleteSubject: (subjectId) => {
            const state = get();
            const profile = getCurrentProfile(state);
            const subjectToDelete = profile.subjects.find(s => s.id === subjectId);
            const mediaToCheck = subjectToDelete ? extractMediaIdsFromSubject(subjectToDelete) : new Set<string>();

            set((state) => {
                const currentProfile = getCurrentProfile(state);
                const newSubjects = currentProfile.subjects.filter(s => s.id !== subjectId);
                const newProgress = {...currentProfile.progress};
                delete newProgress[subjectId];

                let newSession = currentProfile.session;
                if (currentProfile.session.subjectId === subjectId) {
                    newSession = {
                        ...currentProfile.session,
                        subjectId: null,
                        selectedTopicIds: [],
                        queue: [],
                        currentQuestionId: null
                    };
                }

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...currentProfile,
                            subjects: newSubjects,
                            progress: newProgress,
                            session: newSession
                        }
                    }
                };
            });

            cleanupOrphanedMedia(mediaToCheck, get);
        },

        createSubject: (name) => {
            const subjectId = createId();
            const topicId = createId();
            const trimmed = name.trim();
            const subject: Subject = {
                id: subjectId,
                name: trimmed || 'New subject',
                topics: [{id: topicId, name: 'Topic 1', questions: []}]
            };
            set((state) => {
                const profile = getCurrentProfile(state);
                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            subjects: [...profile.subjects, subject]
                        }
                    }
                };
            });
            return subjectId;
        },

        renameSubject: (subjectId, name) => {
            const trimmed = name.trim();
            if (!trimmed) return;
            set((state) => {
                const profile = getCurrentProfile(state);
                const subjects = profile.subjects.map(s =>
                    s.id === subjectId ? {...s, name: trimmed} : s
                );
                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            subjects
                        }
                    }
                };
            });
        },

        addTopic: (subjectId, name) => {
            const topicId = createId();
            const trimmed = name.trim() || 'New topic';
            set((state) => {
                const profile = getCurrentProfile(state);
                const subjects = profile.subjects.map(s => {
                    if (s.id !== subjectId) return s;
                    return {...s, topics: [...s.topics, {id: topicId, name: trimmed, questions: []}]};
                });
                const newSession = rebuildSessionForSubjectIfActive(
                    profile,
                    subjectId,
                    subjects,
                    profile.progress[subjectId]
                );
                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            subjects,
                            session: newSession
                        }
                    }
                };
            });
            return topicId;
        },

        renameTopic: (subjectId, topicId, name) => {
            const trimmed = name.trim();
            if (!trimmed) return;
            set((state) => {
                const profile = getCurrentProfile(state);
                const subjects = profile.subjects.map(s => {
                    if (s.id !== subjectId) return s;
                    return {
                        ...s,
                        topics: s.topics.map(t => (t.id === topicId ? {...t, name: trimmed} : t))
                    };
                });
                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            subjects
                        }
                    }
                };
            });
        },

        deleteTopic: (subjectId, topicId) => {
            const stateBefore = get();
            const profileBefore = getCurrentProfile(stateBefore);
            const subjectBefore = profileBefore.subjects.find(s => s.id === subjectId);
            const topicBefore = subjectBefore?.topics.find(t => t.id === topicId);
            const mediaToCheck = topicBefore ? extractMediaIdsFromTopic(topicBefore) : new Set<string>();

            set((state) => {
                const profile = getCurrentProfile(state);
                const subject = profile.subjects.find(s => s.id === subjectId);
                if (!subject) return state;

                const newTopics = subject.topics.filter(t => t.id !== topicId);
                const subjects = profile.subjects.map(s =>
                    s.id === subjectId ? {...s, topics: newTopics} : s
                );

                const subjSlice = {...(profile.progress[subjectId] || {})};
                delete subjSlice[topicId];
                const newProgress = {...profile.progress};
                if (Object.keys(subjSlice).length === 0) {
                    delete newProgress[subjectId];
                } else {
                    newProgress[subjectId] = subjSlice;
                }

                const selectedTopicIds = profile.session.selectedTopicIds.filter(id => id !== topicId);
                const sessionBase = {...profile.session, selectedTopicIds};
                const profileWithSession = {...profile, session: sessionBase};
                const sliceForSession = newProgress[subjectId];
                const newSession = rebuildSessionForSubjectIfActive(
                    profileWithSession,
                    subjectId,
                    subjects,
                    sliceForSession
                );

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            subjects,
                            progress: newProgress,
                            session: newSession
                        }
                    }
                };
            });

            cleanupOrphanedMedia(mediaToCheck, get);
        },

        addQuestion: (subjectId, topicId, question) => {
            set((state) => {
                const profile = getCurrentProfile(state);
                const subjects = profile.subjects.map(s => {
                    if (s.id !== subjectId) return s;
                    return {
                        ...s,
                        topics: s.topics.map(t =>
                            t.id === topicId ? {...t, questions: [...t.questions, question]} : t
                        )
                    };
                });
                const newSession = rebuildSessionForSubjectIfActive(
                    profile,
                    subjectId,
                    subjects,
                    profile.progress[subjectId]
                );
                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            subjects,
                            session: newSession
                        }
                    }
                };
            });
        },

        updateQuestion: (subjectId, topicId, question) => {
            const stateBefore = get();
            const profileBefore = getCurrentProfile(stateBefore);
            const topicBefore = profileBefore.subjects
                .find(s => s.id === subjectId)
                ?.topics.find(t => t.id === topicId);
            const oldQ = topicBefore?.questions.find(q => q.id === question.id);
            const mediaToCheck = new Set<string>();
            if (oldQ) {
                extractMediaIdsFromQuestion(oldQ).forEach(id => mediaToCheck.add(id));
            }

            set((state) => {
                const profile = getCurrentProfile(state);
                const subjects = profile.subjects.map(s => {
                    if (s.id !== subjectId) return s;
                    return {
                        ...s,
                        topics: s.topics.map(t => {
                            if (t.id !== topicId) return t;
                            return {
                                ...t,
                                questions: t.questions.map(q => (q.id === question.id ? question : q))
                            };
                        })
                    };
                });
                const newSession = rebuildSessionForSubjectIfActive(
                    profile,
                    subjectId,
                    subjects,
                    profile.progress[subjectId]
                );
                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            subjects,
                            session: newSession
                        }
                    }
                };
            });

            cleanupOrphanedMedia(mediaToCheck, get);
        },

        deleteQuestion: (subjectId, topicId, questionId) => {
            const stateBefore = get();
            const profileBefore = getCurrentProfile(stateBefore);
            const qBefore = profileBefore.subjects
                .find(s => s.id === subjectId)
                ?.topics.find(t => t.id === topicId)
                ?.questions.find(q => q.id === questionId);
            const mediaToCheck = qBefore ? extractMediaIdsFromQuestion(qBefore) : new Set<string>();

            set((state) => {
                const profile = getCurrentProfile(state);
                const subjects = profile.subjects.map(s => {
                    if (s.id !== subjectId) return s;
                    return {
                        ...s,
                        topics: s.topics.map(t => {
                            if (t.id !== topicId) return t;
                            return {...t, questions: t.questions.filter(q => q.id !== questionId)};
                        })
                    };
                });

                const subjSlice = {...(profile.progress[subjectId] || {})};
                const topicSlice = {...(subjSlice[topicId] || {})};
                delete topicSlice[questionId];
                const newSubjSlice = {...subjSlice};
                if (Object.keys(topicSlice).length === 0) {
                    delete newSubjSlice[topicId];
                } else {
                    newSubjSlice[topicId] = topicSlice;
                }
                const newProgress = {...profile.progress};
                if (Object.keys(newSubjSlice).length === 0) {
                    delete newProgress[subjectId];
                } else {
                    newProgress[subjectId] = newSubjSlice;
                }

                const sliceForSession = newProgress[subjectId];
                const newSession = rebuildSessionForSubjectIfActive(
                    profile,
                    subjectId,
                    subjects,
                    sliceForSession
                );

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            subjects,
                            progress: newProgress,
                            session: newSession
                        }
                    }
                };
            });

            cleanupOrphanedMedia(mediaToCheck, get);
        },

        startSession: (subjectId) => {
            set((state) => {
                const profile = getCurrentProfile(state);
                const subject = profile.subjects.find(s => s.id === subjectId);
                if (!subject) return state;

                const newSession: SessionState = {
                    ...profile.session,
                    subjectId,
                    selectedTopicIds: [],
                    queue: [],
                    currentQuestionId: null
                };

                const questions = getActiveQuestions(subject, []);
                const queue = generateQueue(
                    questions,
                    flattenProgress(profile.progress[subjectId]),
                    newSession.mode,
                    newSession.includeMastered
                );

                newSession.queue = queue.slice(1);
                newSession.currentQuestionId = queue[0] || null;

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            session: newSession
                        }
                    }
                };
            });
        },

        toggleTopic: (topicId) => {
            set((state) => {
                const profile = getCurrentProfile(state);
                const subject = getCurrentSubject(state);
                if (!subject) return state;

                const currentSelected = profile.session.selectedTopicIds;
                let newSelected = currentSelected.includes(topicId)
                    ? currentSelected.filter(id => id !== topicId)
                    : [...currentSelected, topicId];

                if (newSelected.length === subject.topics.length) {
                    newSelected = [];
                }

                const questions = getActiveQuestions(subject, newSelected);
                const queue = generateQueue(
                    questions,
                    flattenProgress(profile.progress[subject.id]),
                    profile.session.mode,
                    profile.session.includeMastered
                );

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            session: {
                                ...profile.session,
                                selectedTopicIds: newSelected,
                                queue: queue.slice(1),
                                currentQuestionId: queue[0] || null
                            }
                        }
                    }
                };
            });
        },

        selectAllTopics: () => {
            set((state) => {
                const profile = getCurrentProfile(state);
                const subject = getCurrentSubject(state);
                if (!subject) return state;

                const questions = getActiveQuestions(subject, []);
                const queue = generateQueue(
                    questions,
                    flattenProgress(profile.progress[subject.id]),
                    profile.session.mode,
                    profile.session.includeMastered
                );

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            session: {
                                ...profile.session,
                                selectedTopicIds: [],
                                queue: queue.slice(1),
                                currentQuestionId: queue[0] || null
                            }
                        }
                    }
                };
            });
        },

        setMode: (mode) => {
            set((state) => {
                const profile = getCurrentProfile(state);
                const subject = getCurrentSubject(state);

                if (!subject) {
                    return {
                        profiles: {
                            ...state.profiles,
                            [state.activeProfileId]: {
                                ...profile,
                                session: {...profile.session, mode}
                            }
                        }
                    };
                }

                const questions = getActiveQuestions(subject, profile.session.selectedTopicIds);
                const queue = generateQueue(
                    questions,
                    flattenProgress(profile.progress[subject.id]),
                    mode,
                    profile.session.includeMastered
                );

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            session: {
                                ...profile.session,
                                mode,
                                queue: queue.slice(1),
                                currentQuestionId: queue[0] || null
                            }
                        }
                    }
                };
            });
        },

        setIncludeMastered: (include) => {
            set((state) => {
                const profile = getCurrentProfile(state);
                const subject = getCurrentSubject(state);

                if (!subject) {
                    return {
                        profiles: {
                            ...state.profiles,
                            [state.activeProfileId]: {
                                ...profile,
                                session: {...profile.session, includeMastered: include}
                            }
                        }
                    };
                }

                const questions = getActiveQuestions(subject, profile.session.selectedTopicIds);
                const queue = generateQueue(
                    questions,
                    flattenProgress(profile.progress[subject.id]),
                    profile.session.mode,
                    include
                );

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            session: {
                                ...profile.session,
                                includeMastered: include,
                                queue: queue.slice(1),
                                currentQuestionId: queue[0] || null
                            }
                        }
                    }
                };
            });
        },

        restartQueue: () => {
            set((state) => {
                const profile = getCurrentProfile(state);
                const subject = getCurrentSubject(state);
                if (!subject) return state;

                const questions = getActiveQuestions(subject, profile.session.selectedTopicIds);
                const queue = generateQueue(
                    questions,
                    flattenProgress(profile.progress[subject.id]),
                    profile.session.mode,
                    profile.session.includeMastered
                );

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            session: {
                                ...profile.session,
                                queue: queue.slice(1),
                                currentQuestionId: queue[0] || null
                            }
                        }
                    }
                };
            });
        },

        submitAnswer: (answer) => {
            const state = get();
            const profile = getCurrentProfile(state);
            const subject = getCurrentSubject(state);
            const {currentQuestionId} = profile.session;

            if (!subject || !currentQuestionId) return {correct: false};

            let question = null;
            let topicId = null;
            for (const topic of subject.topics) {
                const q = topic.questions.find(q => q.id === currentQuestionId);
                if (q) {
                    question = q;
                    topicId = topic.id;
                    break;
                }
            }

            if (!question || !topicId) return {correct: false};

            const isCorrect = checkAnswer(question, answer);

            set((state) => {
                const currentProfile = state.profiles[state.activeProfileId];
                const subjectProgress = currentProfile.progress[subject.id] || {};
                const topicProgress = subjectProgress[topicId!] || {};
                const currentQProgress = topicProgress[currentQuestionId] || {
                    id: currentQuestionId,
                    correctStreak: 0,
                    attempts: 0,
                    mastered: false
                };

                const newQProgress: QuestionProgress = {
                    ...currentQProgress,
                    attempts: currentQProgress.attempts + 1,
                    correctStreak: isCorrect ? currentQProgress.correctStreak + 1 : 0,
                    mastered: isCorrect
                };

                const newProgress = {
                    ...currentProfile.progress,
                    [subject.id]: {
                        ...subjectProgress,
                        [topicId!]: {
                            ...topicProgress,
                            [currentQuestionId]: newQProgress
                        }
                    }
                };

                const newQueue = [...currentProfile.session.queue];
                const quizSettings = state.settings;
                if (!isCorrect && quizSettings.quizRequeueOnIncorrect) {
                    const insertIndex = randomRequeueInsertIndex(
                        newQueue.length,
                        quizSettings.quizRequeueGapMin,
                        quizSettings.quizRequeueGapMax
                    );
                    newQueue.splice(insertIndex, 0, currentQuestionId);
                }

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...currentProfile,
                            progress: newProgress,
                            session: {
                                ...currentProfile.session,
                                queue: newQueue
                            }
                        }
                    }
                };
            });

            return {correct: isCorrect, explanation: question.explanation};
        },

        nextQuestion: () => {
            set((state) => {
                const profile = getCurrentProfile(state);
                const newQueue = [...profile.session.queue];
                const nextQuestionId = newQueue.shift() || null;

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            session: {
                                ...profile.session,
                                queue: newQueue,
                                currentQuestionId: nextQuestionId,
                                turnCounter: profile.session.turnCounter + 1,
                            }
                        }
                    }
                };
            });
        },

        skipQuestion: () => {
            const state = get();
            const profile = getCurrentProfile(state);
            const subject = getCurrentSubject(state);
            const {currentQuestionId} = profile.session;
            if (!subject || !currentQuestionId) return;

            let topicId = null;
            for (const topic of subject.topics) {
                if (topic.questions.some(q => q.id === currentQuestionId)) {
                    topicId = topic.id;
                    break;
                }
            }
            if (!topicId) return;

            set((state) => {
                const currentProfile = state.profiles[state.activeProfileId];
                const subjectProgress = currentProfile.progress[subject.id] || {};
                const topicProgress = subjectProgress[topicId!] || {};
                const currentQProgress = topicProgress[currentQuestionId] || {
                    id: currentQuestionId,
                    correctStreak: 0,
                    attempts: 0,
                    mastered: false
                };

                const newQProgress = {
                    ...currentQProgress,
                    attempts: currentQProgress.attempts + 1,
                    correctStreak: 0,
                    mastered: false
                };

                const newProgress = {
                    ...currentProfile.progress,
                    [subject.id]: {
                        ...subjectProgress,
                        [topicId!]: {
                            ...topicProgress,
                            [currentQuestionId]: newQProgress
                        }
                    }
                };

                const newQueue = [...currentProfile.session.queue];
                const quizSettings = state.settings;
                if (quizSettings.quizRequeueOnSkip) {
                    const insertIndex = randomRequeueInsertIndex(
                        newQueue.length,
                        quizSettings.quizRequeueGapMin,
                        quizSettings.quizRequeueGapMax
                    );
                    newQueue.splice(insertIndex, 0, currentQuestionId);
                }

                const nextQuestionId = newQueue.shift() || null;

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...currentProfile,
                            progress: newProgress,
                            session: {
                                ...currentProfile.session,
                                queue: newQueue,
                                currentQuestionId: nextQuestionId,
                                turnCounter: currentProfile.session.turnCounter + 1
                            }
                        }
                    }
                };
            });
        },

        resetSubjectProgress: (subjectId) => {
            set((state) => {
                const profile = getCurrentProfile(state);
                const newProgress = {...profile.progress};
                delete newProgress[subjectId];

                let newSession = profile.session;
                if (profile.session.subjectId === subjectId) {
                    const subject = profile.subjects.find(s => s.id === subjectId);
                    if (subject) {
                        const questions = getActiveQuestions(subject, profile.session.selectedTopicIds);
                        const queue = generateQueue(questions, {}, profile.session.mode, profile.session.includeMastered);
                        newSession = {
                            ...profile.session,
                            queue: queue.slice(1),
                            currentQuestionId: queue[0] || null
                        };
                    }
                }

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            progress: newProgress,
                            session: newSession
                        }
                    }
                };
            });
        }
    };
}
