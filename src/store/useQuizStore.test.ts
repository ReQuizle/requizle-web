import {describe, it, expect, beforeEach, vi} from 'vitest';
import {useQuizStore, DEFAULT_SETTINGS, DEFAULT_SESSION_STATE, sanitizePersistedQuizState} from './useQuizStore';
import {act} from 'react';
import type {
    Subject,
    Profile,
    TrueFalseQuestion,
    MultipleChoiceQuestion,
    QuestionProgress,
    SubjectExportV1
} from '../types';

// Mock persistence to avoid localStorage issues in tests
type ZustandSet<T> = (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => void;
type ZustandGet<T> = () => T;
type ZustandApi<T> = {
    setState: ZustandSet<T>;
    getState: ZustandGet<T>;
    destroy: () => void;
};

vi.mock('zustand/middleware', () => ({
    persist: <T,>(config: (set: ZustandSet<T>, get: ZustandGet<T>, api: ZustandApi<T>) => T) =>
        (set: ZustandSet<T>, get: ZustandGet<T>, api: ZustandApi<T>) => config(set, get, api),
    createJSONStorage: () => ({})
}));

// Helper to create test questions
const createTrueFalseQuestion = (id: string, topicId: string): TrueFalseQuestion => ({
    id,
    type: 'true_false',
    topicId,
    prompt: `Question ${id}`,
    answer: true
});

const createMultipleChoiceQuestion = (id: string, topicId: string): MultipleChoiceQuestion => ({
    id,
    type: 'multiple_choice',
    topicId,
    prompt: `Question ${id}`,
    choices: ['A', 'B', 'C', 'D'],
    answerIndex: 0
});

// Helper to create test subjects
const createTestSubject = (id: string = 's1', name: string = 'Test Subject'): Subject => ({
    id,
    name,
    topics: [
        {
            id: 't1',
            name: 'Topic 1',
            questions: [
                createTrueFalseQuestion('q1', 't1'),
                createTrueFalseQuestion('q2', 't1')
            ]
        },
        {
            id: 't2',
            name: 'Topic 2',
            questions: [
                createMultipleChoiceQuestion('q3', 't2'),
                createMultipleChoiceQuestion('q4', 't2')
            ]
        }
    ]
});

const resetStore = () => {
    act(() => {
        useQuizStore.setState({
            profiles: {
                'default': {
                    id: 'default',
                    name: 'Default',
                    subjects: [],
                    progress: {},
                    session: {...DEFAULT_SESSION_STATE},
                    createdAt: Date.now()
                }
            },
            activeProfileId: 'default',
            settings: {...DEFAULT_SETTINGS}
        });
    });
};

describe('useQuizStore', () => {
    beforeEach(() => {
        resetStore();
    });

    describe('initialization', () => {
        it('should initialize with default profile', () => {
            const state = useQuizStore.getState();
            expect(state.profiles['default']).toBeDefined();
            expect(state.activeProfileId).toBe('default');
        });

        it('should have empty subjects initially', () => {
            const state = useQuizStore.getState();
            expect(state.profiles['default'].subjects).toHaveLength(0);
        });

        it('can mark sample data as seeded', () => {
            act(() => {
                useQuizStore.getState().markSampleDataSeeded();
            });

            expect(useQuizStore.getState().settings.sampleDataSeeded).toBe(true);
        });

        it('can toggle the animated background setting', () => {
            expect(useQuizStore.getState().settings.animatedBackground).toBe(true);

            act(() => {
                useQuizStore.getState().setAnimatedBackground(false);
            });

            expect(useQuizStore.getState().settings.animatedBackground).toBe(false);
        });

        it('sanitizes persisted state before hydration', () => {
            const sanitized = sanitizePersistedQuizState({
                activeProfileId: 'missing',
                profiles: {
                    valid: {
                        id: 'valid',
                        name: 'Valid',
                        subjects: [createTestSubject()],
                        progress: {
                            s1: {
                                t1: {
                                    q1: {id: 'q1', attempts: 2, correctStreak: 1, mastered: true},
                                    q2: {id: 'q2', attempts: 'bad', correctStreak: 1, mastered: true}
                                }
                            }
                        },
                        session: {
                            subjectId: 's1',
                            selectedTopicIds: ['t1', 'missing-topic'],
                            mode: 'bad-mode',
                            includeMastered: 'yes',
                            queue: ['q1', 'missing-question'],
                            currentQuestionId: 'q2',
                            turnCounter: 'bad'
                        },
                        createdAt: 100,
                        _media: [{id: 'm1'}]
                    },
                    invalid: {
                        id: 'invalid',
                        name: 'Invalid',
                        subjects: [{id: 's2', name: 'Broken'}]
                    }
                },
                settings: {
                    confirmSubjectDelete: false,
                    confirmProfileDelete: 'no',
                    quizRequeueGapMin: 9,
                    quizRequeueGapMax: 3
                }
            });

            expect(Object.keys(sanitized.profiles)).toEqual(['valid']);
            expect(sanitized.activeProfileId).toBe('valid');
            expect(sanitized.profiles.valid).not.toHaveProperty('_media');
            expect(sanitized.profiles.valid.progress.s1?.t1?.q1).toEqual({
                id: 'q1',
                attempts: 2,
                correctStreak: 1,
                mastered: true
            });
            expect(sanitized.profiles.valid.progress.s1?.t1?.q2).toBeUndefined();
            expect(sanitized.profiles.valid.session).toMatchObject({
                subjectId: 's1',
                selectedTopicIds: ['t1'],
                mode: 'topic_order',
                includeMastered: false,
                queue: ['q1'],
                currentQuestionId: 'q2',
                turnCounter: 0
            });
            expect(sanitized.settings.confirmSubjectDelete).toBe(false);
            expect(sanitized.settings.confirmProfileDelete).toBe(DEFAULT_SETTINGS.confirmProfileDelete);
            expect(sanitized.settings.quizRequeueGapMin).toBe(3);
            expect(sanitized.settings.quizRequeueGapMax).toBe(9);
            expect(sanitized.settings.animatedBackground).toBe(DEFAULT_SETTINGS.animatedBackground);
            expect(sanitized.settings.sampleDataSeeded).toBe(true);
        });

        it('keeps sample data eligible on a fresh install', () => {
            const sanitized = sanitizePersistedQuizState(undefined);

            expect(sanitized.profiles['default']).toBeDefined();
            expect(sanitized.settings.sampleDataSeeded).toBe(false);
        });

        it('does not reseed samples into existing persisted data without the flag', () => {
            const sanitized = sanitizePersistedQuizState({
                activeProfileId: 'default',
                profiles: {
                    default: {
                        id: 'default',
                        name: 'Default',
                        subjects: [],
                        progress: {},
                        session: {...DEFAULT_SESSION_STATE},
                        createdAt: 100
                    }
                },
                settings: {}
            });

            expect(sanitized.settings.sampleDataSeeded).toBe(true);
        });
    });

    describe('setSubjects', () => {
        it('should set subjects for current profile', () => {
            const {setSubjects} = useQuizStore.getState();
            const subjects = [createTestSubject()];

            act(() => {
                setSubjects(subjects);
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].subjects).toHaveLength(1);
            expect(state.profiles['default'].subjects[0].name).toBe('Test Subject');
        });

        it('should replace existing subjects', () => {
            const {setSubjects} = useQuizStore.getState();

            act(() => {
                setSubjects([createTestSubject('s1', 'First')]);
            });

            act(() => {
                setSubjects([createTestSubject('s2', 'Second')]);
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].subjects).toHaveLength(1);
            expect(state.profiles['default'].subjects[0].name).toBe('Second');
        });

        it('clears stale progress and resets session when active subject is removed', () => {
            const {setSubjects, startSession} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject('s1', 'First')]);
                startSession('s1');
                useQuizStore.setState(state => {
                    const profile = state.profiles['default'];
                    return {
                        profiles: {
                            ...state.profiles,
                            default: {
                                ...profile,
                                progress: {
                                    ...profile.progress,
                                    stale: {
                                        t9: {
                                            q9: {id: 'q9', attempts: 1, correctStreak: 0, mastered: false}
                                        }
                                    }
                                }
                            }
                        }
                    };
                });
            });

            act(() => {
                setSubjects([createTestSubject('s2', 'Second')]);
            });

            const profile = useQuizStore.getState().profiles['default'];
            expect(profile.progress.s1).toBeUndefined();
            expect(profile.progress.stale).toBeUndefined();
            expect(profile.session.subjectId).toBeNull();
            expect(profile.session.currentQuestionId).toBeNull();
            expect(profile.session.queue).toEqual([]);
        });
    });

    describe('importSubjects', () => {
        it('should add subjects to existing ones', () => {
            const {setSubjects, importSubjects} = useQuizStore.getState();

            act(() => {
                setSubjects([createTestSubject('s1', 'First')]);
            });

            act(() => {
                importSubjects([createTestSubject('s2', 'Second')]);
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].subjects).toHaveLength(2);
        });

        it('rebuilds queue state when imported subject changes the active subject questions', () => {
            const {setSubjects, startSession, importSubjects} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject('s1', 'First')]);
                startSession('s1');
                useQuizStore.setState(state => {
                    const profile = state.profiles['default'];
                    return {
                        profiles: {
                            ...state.profiles,
                            default: {
                                ...profile,
                                session: {
                                    ...profile.session,
                                    currentQuestionId: 'removed-q',
                                    queue: ['q1', 'removed-q', 'q2']
                                }
                            }
                        }
                    };
                });
            });

            const importedSubject: Subject = {
                id: 's1',
                name: 'First Updated',
                topics: [
                    {
                        id: 't1',
                        name: 'Only Topic',
                        questions: [createTrueFalseQuestion('q1', 't1')]
                    }
                ]
            };

            act(() => {
                importSubjects([importedSubject]);
            });

            const session = useQuizStore.getState().profiles['default'].session;
            expect(session.subjectId).toBe('s1');
            expect(session.currentQuestionId).not.toBe('removed-q');
            expect(session.queue).not.toContain('removed-q');
        });
    });

    describe('content editing', () => {
        it('createSubject adds a subject with one empty topic', () => {
            const {createSubject} = useQuizStore.getState();
            let id = '';
            act(() => {
                id = createSubject('Algebra');
            });
            const state = useQuizStore.getState();
            const s = state.profiles['default'].subjects.find(x => x.id === id);
            expect(s?.name).toBe('Algebra');
            expect(s?.topics).toHaveLength(1);
            expect(s?.topics[0].name).toBe('Topic 1');
            expect(s?.topics[0].questions).toHaveLength(0);
        });

        it('renameSubject updates the name', () => {
            const {setSubjects, renameSubject} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
            });
            act(() => {
                renameSubject('s1', 'Renamed');
            });
            expect(useQuizStore.getState().profiles['default'].subjects[0].name).toBe('Renamed');
        });

        it('addTopic appends a topic and returns its id', () => {
            const {setSubjects, addTopic} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
            });
            let tid = '';
            act(() => {
                tid = addTopic('s1', 'Extra');
            });
            const subj = useQuizStore.getState().profiles['default'].subjects[0];
            expect(subj.topics.some(t => t.id === tid && t.name === 'Extra')).toBe(true);
        });

        it('addQuestion and deleteQuestion update the topic', () => {
            const {setSubjects, addQuestion, deleteQuestion} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
            });
            const q: TrueFalseQuestion = {
                id: 'new-q',
                type: 'true_false',
                topicId: 't1',
                prompt: 'Test prompt',
                answer: false
            };
            act(() => {
                addQuestion('s1', 't1', q);
            });
            let topic = useQuizStore.getState().profiles['default'].subjects[0].topics[0];
            expect(topic.questions.some(x => x.id === 'new-q')).toBe(true);

            act(() => {
                deleteQuestion('s1', 't1', 'new-q');
            });
            topic = useQuizStore.getState().profiles['default'].subjects[0].topics[0];
            expect(topic.questions.some(x => x.id === 'new-q')).toBe(false);
        });

        it('updateQuestion replaces question data', () => {
            const {setSubjects, addQuestion, updateQuestion} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
            });
            const q: TrueFalseQuestion = {
                id: 'uq',
                type: 'true_false',
                topicId: 't1',
                prompt: 'Old',
                answer: true
            };
            act(() => {
                addQuestion('s1', 't1', q);
            });
            const updated: TrueFalseQuestion = {...q, prompt: 'New', answer: false};
            act(() => {
                updateQuestion('s1', 't1', updated);
            });
            const found = useQuizStore.getState().profiles['default'].subjects[0].topics[0].questions.find(
                x => x.id === 'uq'
            ) as TrueFalseQuestion | undefined;
            expect(found?.prompt).toBe('New');
            expect(found?.answer).toBe(false);
        });
    });

    describe('startSession', () => {
        it('should start a session with a subject', () => {
            const {setSubjects, startSession} = useQuizStore.getState();
            const subject = createTestSubject();

            act(() => {
                setSubjects([subject]);
            });

            act(() => {
                startSession('s1');
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.subjectId).toBe('s1');
            expect(state.profiles['default'].session.currentQuestionId).not.toBeNull();
        });

        it('should not start session for non-existent subject', () => {
            const {startSession} = useQuizStore.getState();

            act(() => {
                startSession('non-existent');
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.subjectId).toBeNull();
        });

        it('should reset selected topics when starting session', () => {
            const {setSubjects, startSession, toggleTopic} = useQuizStore.getState();
            const subject = createTestSubject();

            act(() => {
                setSubjects([subject]);
                startSession('s1');
            });

            act(() => {
                toggleTopic('t1');
            });

            // Verify topic is selected
            expect(useQuizStore.getState().profiles['default'].session.selectedTopicIds).toContain('t1');

            // Start session again
            act(() => {
                startSession('s1');
            });

            // Topics should be reset
            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.selectedTopicIds).toHaveLength(0);
        });
    });

    describe('toggleTopic', () => {
        beforeEach(() => {
            const {setSubjects, startSession} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
                startSession('s1');
            });
        });

        it('should add topic to selection', () => {
            const {toggleTopic} = useQuizStore.getState();

            act(() => {
                toggleTopic('t1');
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.selectedTopicIds).toContain('t1');
        });

        it('should remove topic from selection if already selected', () => {
            const {toggleTopic} = useQuizStore.getState();

            act(() => {
                toggleTopic('t1');
            });

            act(() => {
                toggleTopic('t1');
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.selectedTopicIds).not.toContain('t1');
        });

        it('should reset to empty array when all topics are selected', () => {
            const {toggleTopic} = useQuizStore.getState();

            act(() => {
                toggleTopic('t1');
                toggleTopic('t2');
            });

            // When all topics are manually selected, it resets to empty (meaning "all selected")
            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.selectedTopicIds).toEqual([]);
        });

        it('should do nothing if no subject is selected', () => {
            resetStore();
            const {toggleTopic} = useQuizStore.getState();

            act(() => {
                toggleTopic('t1');
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.selectedTopicIds).toHaveLength(0);
        });
    });

    describe('setMode', () => {
        beforeEach(() => {
            const {setSubjects, startSession} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
                startSession('s1');
            });
        });

        it('should change mode to topic_order', () => {
            const {setMode} = useQuizStore.getState();

            act(() => {
                setMode('topic_order');
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.mode).toBe('topic_order');
        });

        it('should change mode to random', () => {
            const {setMode} = useQuizStore.getState();

            act(() => {
                setMode('topic_order');
            });

            act(() => {
                setMode('random');
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.mode).toBe('random');
        });

        it('should update mode even without active subject', () => {
            resetStore();
            const {setMode} = useQuizStore.getState();

            act(() => {
                setMode('topic_order');
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.mode).toBe('topic_order');
        });
    });

    describe('setIncludeMastered', () => {
        it('should set includeMastered to true', () => {
            const {setIncludeMastered} = useQuizStore.getState();

            act(() => {
                setIncludeMastered(true);
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.includeMastered).toBe(true);
        });

        it('should set includeMastered to false', () => {
            const {setIncludeMastered} = useQuizStore.getState();

            act(() => {
                setIncludeMastered(true);
            });

            act(() => {
                setIncludeMastered(false);
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.includeMastered).toBe(false);
        });

        it('should rebuild queue when toggling on with an active subject and all questions mastered', () => {
            const {setSubjects, startSession, setIncludeMastered} = useQuizStore.getState();

            act(() => {
                setSubjects([createTestSubject()]);
                startSession('s1');
            });

            act(() => {
                useQuizStore.setState(s => {
                    const profile = s.profiles['default'];
                    const subjectId = 's1';
                    const subject = profile.subjects.find(x => x.id === subjectId)!;
                    const topicProgress: Record<string, Record<string, QuestionProgress>> = {};
                    for (const topic of subject.topics) {
                        topicProgress[topic.id] = {};
                        for (const q of topic.questions) {
                            topicProgress[topic.id][q.id] = {
                                id: q.id,
                                attempts: 1,
                                correctStreak: 1,
                                mastered: true
                            };
                        }
                    }
                    return {
                        profiles: {
                            ...s.profiles,
                            default: {
                                ...profile,
                                progress: {...profile.progress, [subjectId]: topicProgress},
                                session: {
                                    ...profile.session,
                                    queue: [],
                                    currentQuestionId: null
                                }
                            }
                        }
                    };
                });
            });

            expect(useQuizStore.getState().profiles['default'].session.currentQuestionId).toBeNull();

            act(() => {
                setIncludeMastered(true);
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.includeMastered).toBe(true);
            expect(state.profiles['default'].session.currentQuestionId).not.toBeNull();
            expect(state.profiles['default'].session.queue.length).toBeGreaterThan(0);
        });
    });

    describe('restartQueue', () => {
        beforeEach(() => {
            const {setSubjects, startSession} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
                startSession('s1');
            });
        });

        it('should regenerate the queue', () => {
            useQuizStore.getState();

            act(() => {
                useQuizStore.getState().nextQuestion();
            });

            act(() => {
                useQuizStore.getState().restartQueue();
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.currentQuestionId).not.toBeNull();
            // Queue should have questions
            expect(state.profiles['default'].session.queue.length + (state.profiles['default'].session.currentQuestionId ? 1 : 0)).toBeGreaterThan(0);
        });

        it('should do nothing if no subject is selected', () => {
            resetStore();
            const {restartQueue} = useQuizStore.getState();

            act(() => {
                restartQueue();
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.queue).toHaveLength(0);
        });
    });

    describe('submitAnswer', () => {
        beforeEach(() => {
            const {setSubjects, startSession} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
                startSession('s1');
            });
        });

        it('should return correct: true for correct answer', () => {
            const state = useQuizStore.getState();
            const currentId = state.profiles['default'].session.currentQuestionId;

            // Find the current question to know the correct answer
            const subject = state.profiles['default'].subjects[0];
            let correctAnswer: unknown = true;
            for (const topic of subject.topics) {
                const q = topic.questions.find(q => q.id === currentId);
                if (q) {
                    if (q.type === 'true_false') {
                        correctAnswer = q.answer;
                    } else if (q.type === 'multiple_choice') {
                        correctAnswer = q.answerIndex;
                    }
                    break;
                }
            }

            let result: {correct: boolean};
            act(() => {
                result = useQuizStore.getState().submitAnswer(correctAnswer);
            });

            expect(result!.correct).toBe(true);
        });

        it('should return correct: false for incorrect answer', () => {
            let result: {correct: boolean};
            act(() => {
                result = useQuizStore.getState().submitAnswer('definitely_wrong_answer');
            });

            expect(result!.correct).toBe(false);
        });

        it('should update progress after correct answer', () => {
            useQuizStore.getState();

            act(() => {
                useQuizStore.getState().submitAnswer(true);
            });

            const newState = useQuizStore.getState();
            const progress = newState.profiles['default'].progress;
            expect(Object.keys(progress).length).toBeGreaterThan(0);
        });

        it('should reinsert question into queue after incorrect answer', () => {
            const stateBefore = useQuizStore.getState();
            const currentId = stateBefore.profiles['default'].session.currentQuestionId!;

            act(() => {
                useQuizStore.getState().submitAnswer('wrong');
            });

            const stateAfter = useQuizStore.getState();
            // The current question should be reinserted into the queue
            expect(stateAfter.profiles['default'].session.queue).toContain(currentId);
        });

        it('should not reinsert question when requeue on incorrect is disabled', () => {
            act(() => {
                useQuizStore.getState().setQuizRequeueOnIncorrect(false);
            });
            const stateBefore = useQuizStore.getState();
            const currentId = stateBefore.profiles['default'].session.currentQuestionId!;

            act(() => {
                useQuizStore.getState().submitAnswer('wrong');
            });

            const stateAfter = useQuizStore.getState();
            expect(stateAfter.profiles['default'].session.queue).not.toContain(currentId);
            expect(stateAfter.profiles['default'].session.currentQuestionId).toBe(currentId);
        });

        it('should return correct: false if no subject or question', () => {
            resetStore();

            let result: {correct: boolean};
            act(() => {
                result = useQuizStore.getState().submitAnswer(true);
            });

            expect(result!.correct).toBe(false);
        });
    });

    describe('nextQuestion', () => {
        beforeEach(() => {
            const {setSubjects, startSession} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
                startSession('s1');
            });
        });

        it('should move to next question in queue', () => {
            const stateBefore = useQuizStore.getState();
            const currentBefore = stateBefore.profiles['default'].session.currentQuestionId;
            const nextInQueue = stateBefore.profiles['default'].session.queue[0];

            act(() => {
                useQuizStore.getState().nextQuestion();
            });

            const stateAfter = useQuizStore.getState();
            expect(stateAfter.profiles['default'].session.currentQuestionId).toBe(nextInQueue);
            expect(stateAfter.profiles['default'].session.currentQuestionId).not.toBe(currentBefore);
        });

        it('should set currentQuestionId to null when queue is empty', () => {
            // Empty the queue first
            act(() => {
                useQuizStore.setState(state => ({
                    profiles: {
                        ...state.profiles,
                        'default': {
                            ...state.profiles['default'],
                            session: {
                                ...state.profiles['default'].session,
                                queue: [],
                                currentQuestionId: 'q1'
                            }
                        }
                    }
                }));
            });

            act(() => {
                useQuizStore.getState().nextQuestion();
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.currentQuestionId).toBeNull();
        });
    });

    describe('skipQuestion', () => {
        beforeEach(() => {
            const {setSubjects, startSession} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
                startSession('s1');
            });
        });

        it('should move to next question and reinsert skipped question', () => {
            const stateBefore = useQuizStore.getState();
            const skippedId = stateBefore.profiles['default'].session.currentQuestionId!;

            act(() => {
                useQuizStore.getState().skipQuestion();
            });

            const stateAfter = useQuizStore.getState();
            expect(stateAfter.profiles['default'].session.currentQuestionId).not.toBe(skippedId);
            expect(stateAfter.profiles['default'].session.queue).toContain(skippedId);
        });

        it('should not reinsert skipped question when requeue on skip is disabled', () => {
            act(() => {
                useQuizStore.getState().setQuizRequeueOnSkip(false);
            });
            const stateBefore = useQuizStore.getState();
            const skippedId = stateBefore.profiles['default'].session.currentQuestionId!;

            act(() => {
                useQuizStore.getState().skipQuestion();
            });

            const stateAfter = useQuizStore.getState();
            expect(stateAfter.profiles['default'].session.currentQuestionId).not.toBe(skippedId);
            expect(stateAfter.profiles['default'].session.queue).not.toContain(skippedId);
        });

        it('should update progress (reset streak)', () => {
            useQuizStore.getState();

            act(() => {
                useQuizStore.getState().skipQuestion();
            });

            const stateAfter = useQuizStore.getState();
            const progress = stateAfter.profiles['default'].progress;
            expect(Object.keys(progress).length).toBeGreaterThan(0);
        });

        it('increments turnCounter even when the same question is reselected', () => {
            act(() => {
                useQuizStore.getState().setQuizRequeueGaps(0, 0);
                useQuizStore.setState(state => {
                    const profile = state.profiles['default'];
                    return {
                        profiles: {
                            ...state.profiles,
                            default: {
                                ...profile,
                                session: {
                                    ...profile.session,
                                    currentQuestionId: 'q1',
                                    queue: [],
                                    turnCounter: 7
                                }
                            }
                        }
                    };
                });
            });

            act(() => {
                useQuizStore.getState().skipQuestion();
            });

            const session = useQuizStore.getState().profiles['default'].session;
            expect(session.currentQuestionId).toBe('q1');
            expect(session.turnCounter).toBe(8);
        });

        it('should do nothing if no subject or question', () => {
            resetStore();
            const stateBefore = useQuizStore.getState();

            act(() => {
                useQuizStore.getState().skipQuestion();
            });

            const stateAfter = useQuizStore.getState();
            expect(stateAfter).toEqual(stateBefore);
        });
    });

    describe('resetSubjectProgress', () => {
        beforeEach(() => {
            const {setSubjects, startSession, submitAnswer} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
                startSession('s1');
            });

            // Create some progress
            act(() => {
                submitAnswer(true);
            });
        });

        it('should reset progress for subject', () => {
            const {resetSubjectProgress} = useQuizStore.getState();

            act(() => {
                resetSubjectProgress('s1');
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].progress['s1']).toBeUndefined();
        });

        it('should regenerate queue if resetting current subject', () => {
            const {resetSubjectProgress} = useQuizStore.getState();

            act(() => {
                resetSubjectProgress('s1');
            });

            const state = useQuizStore.getState();
            expect(state.profiles['default'].session.currentQuestionId).not.toBeNull();
        });
    });

    describe('importSubjectExport', () => {
        it('merges subject structure and progress slice', () => {
            const {setSubjects, importSubjectExport} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
            });
            const bundle: SubjectExportV1 = {
                requizleSubjectExport: 1,
                subject: createTestSubject(),
                progress: {
                    t1: {
                        q1: {id: 'q1', attempts: 3, correctStreak: 2, mastered: true}
                    }
                }
            };
            act(() => {
                importSubjectExport(bundle);
            });
            const q1 = useQuizStore.getState().profiles['default'].progress.s1?.t1?.q1;
            expect(q1?.mastered).toBe(true);
            expect(q1?.attempts).toBe(3);
        });

        it('does not clear existing progress when bundle omits progress', () => {
            const {setSubjects, startSession, submitAnswer, importSubjectExport} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
                startSession('s1');
                submitAnswer(true);
            });
            const before = structuredClone(useQuizStore.getState().profiles['default'].progress);
            expect(Object.keys(before.s1 || {})).toContain('t1');

            const bundle: SubjectExportV1 = {
                requizleSubjectExport: 1,
                subject: createTestSubject()
            };
            act(() => {
                importSubjectExport(bundle);
            });
            expect(useQuizStore.getState().profiles['default'].progress).toEqual(before);
        });

        it('ignores malformed progress entries when importing a subject export', () => {
            const {setSubjects, importSubjectExport} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
            });
            const bundle = {
                requizleSubjectExport: 1,
                subject: createTestSubject(),
                progress: {
                    t1: {
                        q1: {id: 'q1', attempts: 'many', correctStreak: 1, mastered: true},
                        q2: {id: 'q2', attempts: 2, correctStreak: 1, mastered: true}
                    },
                    missingTopic: {
                        q5: {id: 'q5', attempts: 1, correctStreak: 1, mastered: true}
                    }
                }
            } as unknown as SubjectExportV1;

            act(() => {
                importSubjectExport(bundle);
            });

            const progress = useQuizStore.getState().profiles['default'].progress.s1;
            expect(progress?.t1?.q1).toBeUndefined();
            expect(progress?.t1?.q2).toEqual({id: 'q2', attempts: 2, correctStreak: 1, mastered: true});
            expect(progress?.missingTopic).toBeUndefined();
        });
    });

    describe('resetTopicProgress', () => {
        beforeEach(() => {
            const {setSubjects, startSession, submitAnswer} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
                startSession('s1');
                submitAnswer(true);
            });
        });

        it('removes progress for one topic only', () => {
            act(() => {
                useQuizStore.getState().resetTopicProgress('s1', 't1');
            });
            const prog = useQuizStore.getState().profiles['default'].progress.s1;
            expect(prog?.t1).toBeUndefined();
        });
    });

    describe('markTopicMastered', () => {
        beforeEach(() => {
            const {setSubjects, startSession} = useQuizStore.getState();
            act(() => {
                setSubjects([createTestSubject()]);
                startSession('s1');
            });
        });

        it('sets all questions in the topic to mastered', () => {
            act(() => {
                useQuizStore.getState().markTopicMastered('s1', 't1');
            });
            const t1 = useQuizStore.getState().profiles['default'].progress.s1?.t1;
            expect(t1?.q1?.mastered).toBe(true);
            expect(t1?.q2?.mastered).toBe(true);
        });
    });

    describe('Profile Management', () => {
        describe('createProfile', () => {
            it('should create a new profile', () => {
                const {createProfile} = useQuizStore.getState();

                act(() => {
                    createProfile('New Profile');
                });

                const state = useQuizStore.getState();
                const newProfileId = state.activeProfileId;
                expect(newProfileId).not.toBe('default');
                expect(state.profiles[newProfileId].name).toBe('New Profile');
            });

            it('should switch to new profile after creation', () => {
                const {createProfile} = useQuizStore.getState();

                act(() => {
                    createProfile('Profile 2');
                });

                const state = useQuizStore.getState();
                expect(state.profiles[state.activeProfileId].name).toBe('Profile 2');
            });

            it('should create profile with empty subjects', () => {
                const {createProfile} = useQuizStore.getState();

                act(() => {
                    createProfile('Empty Profile');
                });

                const state = useQuizStore.getState();
                expect(state.profiles[state.activeProfileId].subjects).toHaveLength(0);
            });
        });

        describe('switchProfile', () => {
            it('should switch to existing profile', () => {
                const {createProfile, switchProfile} = useQuizStore.getState();

                act(() => {
                    createProfile('Profile 2');
                });
                const newId = useQuizStore.getState().activeProfileId;

                act(() => {
                    switchProfile('default');
                });
                expect(useQuizStore.getState().activeProfileId).toBe('default');

                act(() => {
                    switchProfile(newId);
                });
                expect(useQuizStore.getState().activeProfileId).toBe(newId);
            });

            it('should not switch to non-existent profile', () => {
                const {switchProfile} = useQuizStore.getState();

                act(() => {
                    switchProfile('non-existent');
                });

                expect(useQuizStore.getState().activeProfileId).toBe('default');
            });
        });

        describe('deleteProfile', () => {
            it('should delete a profile', () => {
                const {createProfile, deleteProfile} = useQuizStore.getState();

                act(() => {
                    createProfile('To Delete');
                });
                const toDeleteId = useQuizStore.getState().activeProfileId;

                act(() => {
                    deleteProfile(toDeleteId);
                });

                const state = useQuizStore.getState();
                expect(state.profiles[toDeleteId]).toBeUndefined();
            });

            it('should switch to another profile when deleting active one', () => {
                const {createProfile, deleteProfile} = useQuizStore.getState();

                act(() => {
                    createProfile('To Delete');
                });
                const toDeleteId = useQuizStore.getState().activeProfileId;

                act(() => {
                    deleteProfile(toDeleteId);
                });

                const state = useQuizStore.getState();
                expect(state.activeProfileId).not.toBe(toDeleteId);
                expect(state.profiles[state.activeProfileId]).toBeDefined();
            });

            it('should reset to default when deleting last profile', () => {
                // Delete the default profile (the only one)
                const {deleteProfile} = useQuizStore.getState();
                act(() => {
                    useQuizStore.getState().markSampleDataSeeded();
                });

                act(() => {
                    deleteProfile('default');
                });

                const state = useQuizStore.getState();
                expect(state.profiles['default']).toBeDefined();
                expect(state.profiles['default'].name).toBe('Default');
                expect(state.activeProfileId).toBe('default');
                expect(state.settings.sampleDataSeeded).toBe(false);
            });
        });

        describe('importProfile', () => {
            it('should import a profile', () => {
                const profile: Profile = {
                    id: 'imported',
                    name: 'Imported Profile',
                    subjects: [createTestSubject()],
                    progress: {},
                    session: {
                        subjectId: null,
                        selectedTopicIds: [],
                        mode: 'random',
                        includeMastered: false,
                        queue: [],
                        currentQuestionId: null,
                        turnCounter: 0,
                    },
                    createdAt: Date.now()
                };

                const {importProfile} = useQuizStore.getState();

                act(() => {
                    importProfile(profile);
                });

                const state = useQuizStore.getState();
                expect(state.profiles['imported']).toBeDefined();
                expect(state.profiles['imported'].name).toBe('Imported Profile');
                expect(state.activeProfileId).toBe('imported');
            });

            it('sanitizes imported profiles and strips embedded media payloads', () => {
                const profile = {
                    id: 'imported',
                    name: 'Imported Profile',
                    subjects: [createTestSubject()],
                    progress: {
                        s1: {
                            t1: {
                                q1: {id: 'q1', attempts: 3, correctStreak: 2, mastered: true},
                                q2: {id: 'q2', attempts: 'bad', correctStreak: 1, mastered: true}
                            },
                            missingTopic: {
                                q5: {id: 'q5', attempts: 1, correctStreak: 1, mastered: true}
                            }
                        }
                    },
                    session: {
                        subjectId: 's1',
                        selectedTopicIds: ['t1', 'missing-topic'],
                        mode: 'not-a-mode',
                        includeMastered: 'yes',
                        queue: ['q1', 'missing-question'],
                        currentQuestionId: 'q2',
                        turnCounter: -1
                    },
                    createdAt: 100,
                    _media: [{id: 'm1', filename: 'image.png', mimeType: 'image/png', dataBase64: 'abc'}]
                } as unknown as Profile;

                act(() => {
                    useQuizStore.getState().importProfile(profile);
                });

                const imported = useQuizStore.getState().profiles['imported'];
                expect(imported).not.toHaveProperty('_media');
                expect(imported.progress.s1?.t1?.q1).toEqual({
                    id: 'q1',
                    attempts: 3,
                    correctStreak: 2,
                    mastered: true
                });
                expect(imported.progress.s1?.t1?.q2).toBeUndefined();
                expect(imported.progress.s1?.missingTopic).toBeUndefined();
                expect(imported.session).toMatchObject({
                    subjectId: 's1',
                    selectedTopicIds: ['t1'],
                    mode: 'topic_order',
                    includeMastered: false,
                    queue: ['q1'],
                    currentQuestionId: 'q2',
                    turnCounter: 0
                });
            });

            it('rejects invalid profile imports without mutating state', () => {
                const before = useQuizStore.getState();
                const invalidProfile = {
                    id: 'bad',
                    name: 'Bad Profile',
                    subjects: [{id: 's1', name: 'Broken'}]
                } as unknown as Profile;

                expect(() => {
                    act(() => {
                        useQuizStore.getState().importProfile(invalidProfile);
                    });
                }).toThrow(/topics/);

                const after = useQuizStore.getState();
                expect(after.profiles).toBe(before.profiles);
                expect(after.activeProfileId).toBe(before.activeProfileId);
            });

            it('deep merges imported progress with an existing profile', () => {
                const {setSubjects, importProfile} = useQuizStore.getState();
                act(() => {
                    setSubjects([createTestSubject()]);
                    useQuizStore.setState(state => {
                        const profile = state.profiles['default'];
                        return {
                            profiles: {
                                ...state.profiles,
                                default: {
                                    ...profile,
                                    progress: {
                                        s1: {
                                            t1: {
                                                q2: {
                                                    id: 'q2',
                                                    attempts: 5,
                                                    correctStreak: 0,
                                                    mastered: false
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        };
                    });
                });

                const profile: Profile = {
                    id: 'default',
                    name: 'Imported Default',
                    subjects: [createTestSubject()],
                    progress: {
                        s1: {
                            t1: {
                                q1: {id: 'q1', attempts: 2, correctStreak: 1, mastered: true}
                            }
                        }
                    },
                    session: {
                        subjectId: null,
                        selectedTopicIds: [],
                        mode: 'topic_order',
                        includeMastered: false,
                        queue: [],
                        currentQuestionId: null,
                        turnCounter: 0
                    },
                    createdAt: 50
                };

                act(() => {
                    importProfile(profile);
                });

                const progress = useQuizStore.getState().profiles['default'].progress.s1.t1;
                expect(progress.q1).toEqual({id: 'q1', attempts: 2, correctStreak: 1, mastered: true});
                expect(progress.q2).toEqual({id: 'q2', attempts: 5, correctStreak: 0, mastered: false});
            });

            it('reconciles stale active session state when merging an existing profile', () => {
                const {setSubjects, startSession, importProfile} = useQuizStore.getState();
                act(() => {
                    setSubjects([createTestSubject()]);
                    startSession('s1');
                    useQuizStore.setState(state => {
                        const profile = state.profiles.default;
                        return {
                            profiles: {
                                ...state.profiles,
                                default: {
                                    ...profile,
                                    session: {
                                        ...profile.session,
                                        selectedTopicIds: ['t1', 'missing-topic'],
                                        currentQuestionId: 'removed-q',
                                        queue: ['q1', 'removed-q', 'q2']
                                    }
                                }
                            }
                        };
                    });
                });

                const profile: Profile = {
                    id: 'default',
                    name: 'Imported Default',
                    subjects: [createTestSubject()],
                    progress: {},
                    session: {
                        subjectId: null,
                        selectedTopicIds: [],
                        mode: 'topic_order',
                        includeMastered: false,
                        queue: [],
                        currentQuestionId: null,
                        turnCounter: 0
                    },
                    createdAt: 50
                };

                act(() => {
                    importProfile(profile);
                });

                const session = useQuizStore.getState().profiles.default.session;
                expect(session.selectedTopicIds).toEqual(['t1']);
                expect(session.currentQuestionId).not.toBe('removed-q');
                expect(session.queue).not.toContain('removed-q');
            });
        });
    });
});
