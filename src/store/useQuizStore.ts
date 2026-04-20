import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import type {Subject, SessionState, StudyMode, QuestionProgress, Profile} from '../types';
import {
    generateQueue,
    getActiveQuestions,
    checkAnswer,
    randomRequeueInsertIndex,
    normalizeRequeueGapRange
} from '../utils/quizLogic';
import {indexedDBStorage, clearStoreData, migrateFromLocalStorage} from '../utils/indexedDBStorage';
import {deleteMedia, isIndexedDBMedia, extractMediaId} from '../utils/mediaStorage';
import {v4 as uuidv4} from 'uuid';

interface Settings {
    confirmSubjectDelete: boolean;
    confirmProfileDelete: boolean;
    /** When false, wrong answers do not put the question back in the queue (advance-only for this pass). */
    quizRequeueOnIncorrect: boolean;
    /** When false, skipped questions are not reinserted. */
    quizRequeueOnSkip: boolean;
    /** Minimum positions ahead to reinsert (inclusive). Default 4 matches previous app behavior. */
    quizRequeueGapMin: number;
    /** Maximum positions ahead to reinsert (inclusive). */
    quizRequeueGapMax: number;
}

interface QuizState {
    profiles: Record<string, Profile>;
    activeProfileId: string;
    settings: Settings;

    // Actions
    setSubjects: (subjects: Subject[]) => void;
    importSubjects: (newSubjects: Subject[]) => void;
    deleteSubject: (subjectId: string) => void;

    startSession: (subjectId: string) => void;
    toggleTopic: (topicId: string) => void;
    selectAllTopics: () => void;
    setMode: (mode: StudyMode) => void;
    setIncludeMastered: (include: boolean) => void;
    restartQueue: () => void;

    submitAnswer: (answer: unknown) => {correct: boolean; explanation?: string};
    skipQuestion: () => void;
    nextQuestion: () => void;

    resetSubjectProgress: (subjectId: string) => void;

    // Profile Actions
    createProfile: (name: string) => void;
    renameProfile: (id: string, newName: string) => void;
    switchProfile: (id: string) => void;
    deleteProfile: (id: string) => void;
    importProfile: (profile: Profile) => void;
    resetAllData: () => void;

    // Settings Actions
    setConfirmSubjectDelete: (confirm: boolean) => void;
    setConfirmProfileDelete: (confirm: boolean) => void;
    setQuizRequeueOnIncorrect: (value: boolean) => void;
    setQuizRequeueOnSkip: (value: boolean) => void;
    setQuizRequeueGaps: (minGap: number, maxGap: number) => void;
}

// Helper to get current profile
const getCurrentProfile = (state: QuizState) => state.profiles[state.activeProfileId];

// Helper to get current subject from state
const getCurrentSubject = (state: QuizState) => {
    const profile = getCurrentProfile(state);
    if (!profile) return undefined;
    return profile.subjects.find(s => s.id === profile.session.subjectId);
};

// Helper to flatten progress map for a subject
function flattenProgress(subjectProgress: Record<string, Record<string, QuestionProgress>> | undefined): Record<string, QuestionProgress> {
    if (!subjectProgress) return {};
    const flat: Record<string, QuestionProgress> = {};
    Object.values(subjectProgress).forEach(topicProgress => {
        Object.assign(flat, topicProgress);
    });
    return flat;
}

// Extract all IndexedDB media IDs from a subject
function extractMediaIdsFromSubject(subject: Subject): Set<string> {
    const mediaIds = new Set<string>();
    for (const topic of subject.topics) {
        for (const question of topic.questions) {
            if (question.media && isIndexedDBMedia(question.media)) {
                mediaIds.add(extractMediaId(question.media));
            }
        }
    }
    return mediaIds;
}

// Extract all IndexedDB media IDs from all profiles
function extractAllMediaIds(profiles: Record<string, Profile>): Set<string> {
    const allMediaIds = new Set<string>();
    for (const profile of Object.values(profiles)) {
        for (const subject of profile.subjects) {
            const subjectMediaIds = extractMediaIdsFromSubject(subject);
            subjectMediaIds.forEach(id => allMediaIds.add(id));
        }
    }
    return allMediaIds;
}

const DEFAULT_PROFILE_ID = 'default';

/** Fresh study session before a subject is chosen. Exported for UI fallbacks. */
export const DEFAULT_SESSION_STATE: SessionState = {
    subjectId: null,
    selectedTopicIds: [],
    mode: 'random',
    includeMastered: false,
    queue: [],
    currentQuestionId: null,
    turnCounter: 0
};

export const DEFAULT_SETTINGS: Settings = {
    confirmSubjectDelete: true,
    confirmProfileDelete: true,
    quizRequeueOnIncorrect: true,
    quizRequeueOnSkip: true,
    quizRequeueGapMin: 4,
    quizRequeueGapMax: 6
};

export const useQuizStore = create<QuizState>()(
    persist(
        (set, get) => ({
            profiles: {
                [DEFAULT_PROFILE_ID]: {
                    id: DEFAULT_PROFILE_ID,
                    name: 'Default',
                    subjects: [],
                    progress: {},
                    session: {...DEFAULT_SESSION_STATE},
                    createdAt: Date.now()

                }
            },
            activeProfileId: DEFAULT_PROFILE_ID,
            settings: {...DEFAULT_SETTINGS},

            setSubjects: (subjects) => set((state) => {
                const profile = getCurrentProfile(state);
                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            subjects
                        }
                    }
                };
            }),

            importSubjects: (newSubjects) => set((state) => {
                const profile = getCurrentProfile(state);

                // Merge subjects: update existing, add new
                const mergedSubjects = [...profile.subjects];

                for (const newSubject of newSubjects) {
                    const existingIndex = mergedSubjects.findIndex(s => s.id === newSubject.id);

                    if (existingIndex === -1) {
                        // Subject doesn't exist, add it
                        mergedSubjects.push(newSubject);
                    } else {
                        // Subject exists, merge topics
                        const existingSubject = mergedSubjects[existingIndex];
                        const mergedTopics = [...existingSubject.topics];

                        for (const newTopic of newSubject.topics) {
                            const existingTopicIndex = mergedTopics.findIndex(t => t.id === newTopic.id);

                            if (existingTopicIndex === -1) {
                                // Topic doesn't exist, add it
                                mergedTopics.push(newTopic);
                            } else {
                                // Topic exists, merge questions
                                const existingTopic = mergedTopics[existingTopicIndex];
                                const mergedQuestions = [...existingTopic.questions];

                                for (const newQuestion of newTopic.questions) {
                                    const existingQuestionIndex = mergedQuestions.findIndex(q => q.id === newQuestion.id);

                                    if (existingQuestionIndex === -1) {
                                        // Question doesn't exist, add it
                                        mergedQuestions.push(newQuestion);
                                    } else {
                                        // Question exists, overwrite it
                                        mergedQuestions[existingQuestionIndex] = newQuestion;
                                    }
                                }

                                mergedTopics[existingTopicIndex] = {
                                    ...existingTopic,
                                    ...newTopic,
                                    questions: mergedQuestions
                                };
                            }
                        }

                        mergedSubjects[existingIndex] = {
                            ...existingSubject,
                            ...newSubject,
                            topics: mergedTopics
                        };
                    }
                }

                return {
                    profiles: {
                        ...state.profiles,
                        [state.activeProfileId]: {
                            ...profile,
                            subjects: mergedSubjects
                        }
                    }
                };
            }),

            deleteSubject: (subjectId) => {
                const state = get();
                const profile = getCurrentProfile(state);
                const subjectToDelete = profile.subjects.find(s => s.id === subjectId);

                // Extract media IDs from the subject being deleted
                const mediaToCheck = subjectToDelete ? extractMediaIdsFromSubject(subjectToDelete) : new Set<string>();

                // Update state synchronously
                set((state) => {
                    const currentProfile = getCurrentProfile(state);
                    const newSubjects = currentProfile.subjects.filter(s => s.id !== subjectId);

                    // Also remove progress for this subject
                    const newProgress = {...currentProfile.progress};
                    delete newProgress[subjectId];

                    // If we're deleting the current subject, clear the session
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

                // Clean up orphaned media asynchronously (after state update)
                if (mediaToCheck.size > 0) {
                    // Get updated state after deletion
                    const updatedState = get();
                    const stillInUse = extractAllMediaIds(updatedState.profiles);

                    // Delete media that's no longer used anywhere
                    for (const mediaId of mediaToCheck) {
                        if (!stillInUse.has(mediaId)) {
                            deleteMedia(mediaId).catch(err => {
                                console.error(`Failed to delete orphaned media ${mediaId}:`, err);
                            });
                        }
                    }
                }
            },

            startSession: (subjectId) => {
                set((state) => {
                    const profile = getCurrentProfile(state);
                    const subject = profile.subjects.find(s => s.id === subjectId);
                    if (!subject) return state;

                    const newSession: SessionState = {
                        ...profile.session,
                        subjectId,
                        selectedTopicIds: [], // Reset selection to "all"
                        queue: [],
                        currentQuestionId: null
                    };

                    // Generate initial queue
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

                    // If all topics are now selected, reset to empty array (which means "all")
                    if (newSelected.length === subject.topics.length) {
                        newSelected = [];
                    }

                    // Rebuild queue
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

                    // Empty array means all topics selected
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

                // Find question
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

                // Update progress
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

                    // Queue management
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
                                    currentQuestionId: nextQuestionId
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
            },

            // Profile Actions
            createProfile: (name) => {
                const newId = uuidv4();
                const newProfile: Profile = {
                    id: newId,
                    name,
                    subjects: [],
                    progress: {},
                    session: {...DEFAULT_SESSION_STATE},
                    createdAt: Date.now()
                };

                set(state => ({
                    profiles: {...state.profiles, [newId]: newProfile},
                    activeProfileId: newId
                }));
            },

            renameProfile: (id, newName) => {
                set(state => {
                    const profile = state.profiles[id];
                    if (!profile) return state;

                    return {
                        profiles: {
                            ...state.profiles,
                            [id]: {
                                ...profile,
                                name: newName
                            }
                        }
                    };
                });
            },

            switchProfile: (id) => {
                set(state => {
                    if (!state.profiles[id]) return state;
                    return {activeProfileId: id};
                });
            },

            deleteProfile: (id) => {
                set(state => {
                    const profileIds = Object.keys(state.profiles);

                    // If this is the last profile, reset it to Default
                    if (profileIds.length === 1 && profileIds[0] === id) {
                        const resetDefault: Profile = {
                            id: DEFAULT_PROFILE_ID,
                            name: 'Default',
                            subjects: [],
                            progress: {},
                            session: {...DEFAULT_SESSION_STATE},
                            createdAt: Date.now()
                        };
                        return {
                            profiles: {
                                [DEFAULT_PROFILE_ID]: resetDefault
                            },
                            activeProfileId: DEFAULT_PROFILE_ID
                        };
                    }

                    const newProfiles = {...state.profiles};
                    delete newProfiles[id];

                    // If deleting active profile, switch to another one
                    let newActiveId = state.activeProfileId;
                    if (state.activeProfileId === id) {
                        // Switch to the most recently created profile
                        const remaining = Object.values(newProfiles).sort((a, b) => b.createdAt - a.createdAt);
                        newActiveId = remaining[0].id;
                    }

                    return {
                        profiles: newProfiles,
                        activeProfileId: newActiveId
                    };
                });
            },

            importProfile: (profile) => {
                set(state => {
                    const existingProfile = state.profiles[profile.id];

                    if (!existingProfile) {
                        // Profile doesn't exist, add it directly
                        return {
                            profiles: {
                                ...state.profiles,
                                [profile.id]: profile
                            },
                            activeProfileId: profile.id
                        };
                    }

                    // Profile exists, merge it
                    // Merge subjects using the same logic
                    const mergedSubjects = [...existingProfile.subjects];

                    for (const newSubject of profile.subjects) {
                        const existingIndex = mergedSubjects.findIndex(s => s.id === newSubject.id);

                        if (existingIndex === -1) {
                            mergedSubjects.push(newSubject);
                        } else {
                            const existingSubject = mergedSubjects[existingIndex];
                            const mergedTopics = [...existingSubject.topics];

                            for (const newTopic of newSubject.topics) {
                                const existingTopicIndex = mergedTopics.findIndex(t => t.id === newTopic.id);

                                if (existingTopicIndex === -1) {
                                    mergedTopics.push(newTopic);
                                } else {
                                    const existingTopic = mergedTopics[existingTopicIndex];
                                    const mergedQuestions = [...existingTopic.questions];

                                    for (const newQuestion of newTopic.questions) {
                                        const existingQuestionIndex = mergedQuestions.findIndex(q => q.id === newQuestion.id);

                                        if (existingQuestionIndex === -1) {
                                            mergedQuestions.push(newQuestion);
                                        } else {
                                            mergedQuestions[existingQuestionIndex] = newQuestion;
                                        }
                                    }

                                    mergedTopics[existingTopicIndex] = {
                                        ...existingTopic,
                                        ...newTopic,
                                        questions: mergedQuestions
                                    };
                                }
                            }

                            mergedSubjects[existingIndex] = {
                                ...existingSubject,
                                ...newSubject,
                                topics: mergedTopics
                            };
                        }
                    }

                    // Merge progress: keep existing, overwrite with imported
                    const mergedProgress = {...existingProfile.progress};
                    for (const [subjectId, subjectProgress] of Object.entries(profile.progress)) {
                        if (!mergedProgress[subjectId]) {
                            mergedProgress[subjectId] = subjectProgress;
                        } else {
                            mergedProgress[subjectId] = {
                                ...mergedProgress[subjectId],
                                ...subjectProgress
                            };
                        }
                    }

                    return {
                        profiles: {
                            ...state.profiles,
                            [profile.id]: {
                                ...existingProfile,
                                ...profile,
                                subjects: mergedSubjects,
                                progress: mergedProgress
                            }
                        },
                        activeProfileId: profile.id
                    };
                });
            },

            resetAllData: () => {
                // Clear IndexedDB store data
                clearStoreData();
                // Also clear localStorage (for legacy data and theme)
                localStorage.removeItem('quiz-storage');
                localStorage.removeItem('theme');
                window.location.reload();
            },

            setConfirmSubjectDelete: (confirm) => set((state) => ({
                settings: {...state.settings, confirmSubjectDelete: confirm}
            })),

            setConfirmProfileDelete: (confirm) => set((state) => ({
                settings: {...state.settings, confirmProfileDelete: confirm}
            })),

            setQuizRequeueOnIncorrect: (value) => set((state) => ({
                settings: {...state.settings, quizRequeueOnIncorrect: value}
            })),

            setQuizRequeueOnSkip: (value) => set((state) => ({
                settings: {...state.settings, quizRequeueOnSkip: value}
            })),

            setQuizRequeueGaps: (minGap, maxGap) => set((state) => {
                const {min, max} = normalizeRequeueGapRange(minGap, maxGap);
                return {
                    settings: {
                        ...state.settings,
                        quizRequeueGapMin: min,
                        quizRequeueGapMax: max
                    }
                };
            })
        }),
        {
            name: 'quiz-storage',
            version: 1,
            // Use IndexedDB for storage instead of localStorage to avoid quota limits
            storage: createJSONStorage(() => indexedDBStorage),
            // Migrate localStorage data to IndexedDB on first load
            onRehydrateStorage: () => {
                // Trigger migration from localStorage to IndexedDB
                migrateFromLocalStorage('quiz-storage');
                return undefined;
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            migrate: (persistedState: any, version: number) => {
                if (version === 0 || version === undefined) {
                    // Migrate from version 0 (flat state) to version 1 (profiles)
                    const defaultProfile: Profile = {
                        id: DEFAULT_PROFILE_ID,
                        name: 'Default',
                        subjects: persistedState.subjects || [],
                        progress: persistedState.progress || {},
                        session: {
                            ...DEFAULT_SESSION_STATE,
                            ...(persistedState.session || {}),
                        },
                        createdAt: Date.now()
                    };

                    return {
                        profiles: {[DEFAULT_PROFILE_ID]: defaultProfile},
                        activeProfileId: DEFAULT_PROFILE_ID,
                        settings: {...DEFAULT_SETTINGS}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any;
                }

                // Ensure all profiles have turnCounter in their session
                if (persistedState.profiles) {
                    for (const profileId of Object.keys(persistedState.profiles)) {
                        const profile = persistedState.profiles[profileId];
                        if (profile.session && typeof profile.session.turnCounter !== 'number') {
                            profile.session.turnCounter = 0;
                        }
                    }
                }

                if (!persistedState.settings || typeof persistedState.settings !== 'object') {
                    persistedState.settings = {...DEFAULT_SETTINGS};
                } else {
                    persistedState.settings = {
                        ...DEFAULT_SETTINGS,
                        ...persistedState.settings
                    };
                    if (typeof persistedState.settings.quizRequeueOnIncorrect !== 'boolean') {
                        persistedState.settings.quizRequeueOnIncorrect = DEFAULT_SETTINGS.quizRequeueOnIncorrect;
                    }
                    if (typeof persistedState.settings.quizRequeueOnSkip !== 'boolean') {
                        persistedState.settings.quizRequeueOnSkip = DEFAULT_SETTINGS.quizRequeueOnSkip;
                    }
                    const {min, max} = normalizeRequeueGapRange(
                        persistedState.settings.quizRequeueGapMin ?? DEFAULT_SETTINGS.quizRequeueGapMin,
                        persistedState.settings.quizRequeueGapMax ?? DEFAULT_SETTINGS.quizRequeueGapMax
                    );
                    persistedState.settings.quizRequeueGapMin = min;
                    persistedState.settings.quizRequeueGapMax = max;
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return persistedState as any as QuizState;
            }

        }
    )
);

// Initialize: ensure migration from localStorage happens on app load
migrateFromLocalStorage('quiz-storage');
