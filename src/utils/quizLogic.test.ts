import {describe, it, expect, vi} from 'vitest';
import {
    generateQueue,
    checkAnswer,
    getActiveQuestions,
    calculateMastery,
    normalizeRequeueGapRange,
    randomRequeueInsertIndex
} from './quizLogic';
import type {Question, Subject, QuestionProgress, MultipleChoiceQuestion, MultipleAnswerQuestion, TrueFalseQuestion, KeywordsQuestion, MatchingQuestion, WordBankQuestion} from '../types';

// Helper to create typed questions
const createMultipleChoice = (overrides: Partial<MultipleChoiceQuestion> = {}): MultipleChoiceQuestion => ({
    id: 'mc1',
    type: 'multiple_choice',
    topicId: 't1',
    prompt: 'MC Question',
    choices: ['A', 'B', 'C', 'D'],
    answerIndex: 0,
    ...overrides
});

const createMultipleAnswer = (overrides: Partial<MultipleAnswerQuestion> = {}): MultipleAnswerQuestion => ({
    id: 'ma1',
    type: 'multiple_answer',
    topicId: 't1',
    prompt: 'MA Question',
    choices: ['A', 'B', 'C', 'D'],
    answerIndices: [0, 2],
    ...overrides
});

const createTrueFalse = (overrides: Partial<TrueFalseQuestion> = {}): TrueFalseQuestion => ({
    id: 'tf1',
    type: 'true_false',
    topicId: 't1',
    prompt: 'TF Question',
    answer: true,
    ...overrides
});

const createKeywords = (overrides: Partial<KeywordsQuestion> = {}): KeywordsQuestion => ({
    id: 'kw1',
    type: 'keywords',
    topicId: 't1',
    prompt: 'Keywords Question',
    answer: 'Paris',
    ...overrides
});

const createMatching = (overrides: Partial<MatchingQuestion> = {}): MatchingQuestion => ({
    id: 'm1',
    type: 'matching',
    topicId: 't1',
    prompt: 'Matching Question',
    pairs: [
        {left: 'A', right: '1'},
        {left: 'B', right: '2'},
        {left: 'C', right: '3'}
    ],
    ...overrides
});

const createWordBank = (overrides: Partial<WordBankQuestion> = {}): WordBankQuestion => ({
    id: 'wb1',
    type: 'word_bank',
    topicId: 't1',
    prompt: 'Word Bank Question',
    sentence: 'The _ is _ today.',
    wordBank: ['sky', 'blue', 'red', 'green'],
    answers: ['sky', 'blue'],
    ...overrides
});

describe('quizLogic', () => {
    describe('calculateMastery', () => {
        it('should return 0 for empty questions array', () => {
            expect(calculateMastery([], {})).toBe(0);
        });

        it('should return 0 when no questions are mastered', () => {
            const questions: Question[] = [
                createTrueFalse({id: 'q1'}),
                createTrueFalse({id: 'q2'})
            ];
            const progress: Record<string, QuestionProgress> = {
                'q1': {id: 'q1', attempts: 1, correctStreak: 1, mastered: false},
                'q2': {id: 'q2', attempts: 1, correctStreak: 0, mastered: false}
            };
            expect(calculateMastery(questions, progress)).toBe(0);
        });

        it('should return 50 when half the questions are mastered', () => {
            const questions: Question[] = [
                createTrueFalse({id: 'q1'}),
                createTrueFalse({id: 'q2'})
            ];
            const progress: Record<string, QuestionProgress> = {
                'q1': {id: 'q1', attempts: 3, correctStreak: 3, mastered: true},
                'q2': {id: 'q2', attempts: 1, correctStreak: 0, mastered: false}
            };
            expect(calculateMastery(questions, progress)).toBe(50);
        });

        it('should return 100 when all questions are mastered', () => {
            const questions: Question[] = [
                createTrueFalse({id: 'q1'}),
                createTrueFalse({id: 'q2'})
            ];
            const progress: Record<string, QuestionProgress> = {
                'q1': {id: 'q1', attempts: 3, correctStreak: 3, mastered: true},
                'q2': {id: 'q2', attempts: 3, correctStreak: 3, mastered: true}
            };
            expect(calculateMastery(questions, progress)).toBe(100);
        });

        it('should handle questions with no progress entry', () => {
            const questions: Question[] = [
                createTrueFalse({id: 'q1'}),
                createTrueFalse({id: 'q2'})
            ];
            const progress: Record<string, QuestionProgress> = {
                'q1': {id: 'q1', attempts: 3, correctStreak: 3, mastered: true}
                // q2 has no progress
            };
            expect(calculateMastery(questions, progress)).toBe(50);
        });
    });

    describe('getActiveQuestions', () => {
        const subject: Subject = {
            id: 's1',
            name: 'Subject 1',
            topics: [
                {
                    id: 't1',
                    name: 'Topic 1',
                    questions: [
                        createTrueFalse({id: 'q1', topicId: 't1'}),
                        createTrueFalse({id: 'q2', topicId: 't1'})
                    ]
                },
                {
                    id: 't2',
                    name: 'Topic 2',
                    questions: [
                        createTrueFalse({id: 'q3', topicId: 't2'})
                    ]
                },
                {
                    id: 't3',
                    name: 'Topic 3',
                    questions: [
                        createMultipleChoice({id: 'q4', topicId: 't3'}),
                        createKeywords({id: 'q5', topicId: 't3'})
                    ]
                }
            ]
        };

        it('should return all questions if no topics selected', () => {
            const questions = getActiveQuestions(subject, []);
            expect(questions).toHaveLength(5);
        });

        it('should return questions only for selected topics', () => {
            const questions = getActiveQuestions(subject, ['t1']);
            expect(questions).toHaveLength(2);
            expect(questions.map(q => q.id)).toEqual(['q1', 'q2']);
        });

        it('should return questions for multiple selected topics', () => {
            const questions = getActiveQuestions(subject, ['t1', 't3']);
            expect(questions).toHaveLength(4);
            expect(questions.map(q => q.id)).toEqual(['q1', 'q2', 'q4', 'q5']);
        });

        it('should return empty array for null subject', () => {
            const questions = getActiveQuestions(null, []);
            expect(questions).toHaveLength(0);
        });

        it('should return empty array for undefined subject', () => {
            const questions = getActiveQuestions(undefined, []);
            expect(questions).toHaveLength(0);
        });
    });

    describe('generateQueue', () => {
        const questions: Question[] = [
            createTrueFalse({id: 'q1'}),
            createTrueFalse({id: 'q2'}),
            createTrueFalse({id: 'q3'}),
            createTrueFalse({id: 'q4'}),
            createTrueFalse({id: 'q5'})
        ];

        const progressWithMastered: Record<string, QuestionProgress> = {
            'q1': {id: 'q1', attempts: 3, correctStreak: 3, mastered: true},
            'q2': {id: 'q2', attempts: 1, correctStreak: 0, mastered: false},
            'q3': {id: 'q3', attempts: 5, correctStreak: 3, mastered: true}
        };

        it('should generate a queue of question IDs', () => {
            const queue = generateQueue(questions, {}, 'random', false);
            expect(queue).toHaveLength(5);
            expect(queue).toContain('q1');
            expect(queue).toContain('q2');
            expect(queue).toContain('q3');
            expect(queue).toContain('q4');
            expect(queue).toContain('q5');
        });

        it('should exclude mastered questions if includeMastered is false', () => {
            const queue = generateQueue(questions, progressWithMastered, 'random', false);
            expect(queue).not.toContain('q1');
            expect(queue).not.toContain('q3');
            expect(queue).toContain('q2');
            expect(queue).toContain('q4');
            expect(queue).toContain('q5');
            expect(queue).toHaveLength(3);
        });

        it('should include mastered questions if includeMastered is true', () => {
            const queue = generateQueue(questions, progressWithMastered, 'random', true);
            expect(queue).toContain('q1');
            expect(queue).toContain('q3');
            expect(queue).toHaveLength(5);
        });

        it('should return empty array when all questions are mastered and includeMastered is false', () => {
            const allMastered: Record<string, QuestionProgress> = {
                'q1': {id: 'q1', attempts: 3, correctStreak: 3, mastered: true},
                'q2': {id: 'q2', attempts: 3, correctStreak: 3, mastered: true},
                'q3': {id: 'q3', attempts: 3, correctStreak: 3, mastered: true},
                'q4': {id: 'q4', attempts: 3, correctStreak: 3, mastered: true},
                'q5': {id: 'q5', attempts: 3, correctStreak: 3, mastered: true}
            };
            const queue = generateQueue(questions, allMastered, 'random', false);
            expect(queue).toHaveLength(0);
        });

        it('should preserve order in topic_order mode', () => {
            const queue = generateQueue(questions, {}, 'topic_order', false);
            expect(queue).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
        });

        it('should shuffle in random mode', () => {
            // Run multiple times to ensure it's actually shuffling (statistical test)
            const results: string[][] = [];
            for (let i = 0; i < 10; i++) {
                results.push(generateQueue(questions, {}, 'random', false));
            }
            // At least one should be different from the original order
            const allSameAsOriginal = results.every(r => r.join(',') === 'q1,q2,q3,q4,q5');
            expect(allSameAsOriginal).toBe(false);
        });

        it('should return empty array for empty questions array', () => {
            const queue = generateQueue([], {}, 'random', false);
            expect(queue).toHaveLength(0);
        });
    });

    describe('normalizeRequeueGapRange', () => {
        it('should order min and max and clamp to 0-100', () => {
            expect(normalizeRequeueGapRange(8, 4)).toEqual({min: 4, max: 8});
            expect(normalizeRequeueGapRange(-5, 150)).toEqual({min: 0, max: 100});
        });
    });

    describe('randomRequeueInsertIndex', () => {
        it('should not exceed queue length', () => {
            const rnd = vi.spyOn(Math, 'random').mockReturnValue(0);
            expect(randomRequeueInsertIndex(2, 4, 6)).toBe(2);
            rnd.mockRestore();
        });

        it('should pick min offset when random draws 0', () => {
            const rnd = vi.spyOn(Math, 'random').mockReturnValue(0);
            expect(randomRequeueInsertIndex(20, 4, 6)).toBe(4);
            rnd.mockRestore();
        });
    });

    describe('checkAnswer', () => {
        describe('multiple_choice', () => {
            const question = createMultipleChoice({answerIndex: 2});

            it('should return true for correct answer index', () => {
                expect(checkAnswer(question, 2)).toBe(true);
            });

            it('should return false for incorrect answer index', () => {
                expect(checkAnswer(question, 0)).toBe(false);
                expect(checkAnswer(question, 1)).toBe(false);
                expect(checkAnswer(question, 3)).toBe(false);
            });
        });

        describe('multiple_answer', () => {
            const question = createMultipleAnswer({answerIndices: [0, 2, 3]});

            it('should return true for correct answer indices (same order)', () => {
                expect(checkAnswer(question, [0, 2, 3])).toBe(true);
            });

            it('should return true for correct answer indices (different order)', () => {
                expect(checkAnswer(question, [3, 0, 2])).toBe(true);
                expect(checkAnswer(question, [2, 3, 0])).toBe(true);
            });

            it('should return false for missing indices', () => {
                expect(checkAnswer(question, [0, 2])).toBe(false);
                expect(checkAnswer(question, [0])).toBe(false);
            });

            it('should return false for extra indices', () => {
                expect(checkAnswer(question, [0, 1, 2, 3])).toBe(false);
            });

            it('should return false for wrong indices', () => {
                expect(checkAnswer(question, [1, 2, 3])).toBe(false);
            });

            it('should return false for non-array answer', () => {
                expect(checkAnswer(question, 0)).toBe(false);
                expect(checkAnswer(question, 'test')).toBe(false);
                expect(checkAnswer(question, null)).toBe(false);
            });
        });

        describe('true_false', () => {
            it('should return true for correct true answer', () => {
                const question = createTrueFalse({answer: true});
                expect(checkAnswer(question, true)).toBe(true);
                expect(checkAnswer(question, false)).toBe(false);
            });

            it('should return true for correct false answer', () => {
                const question = createTrueFalse({answer: false});
                expect(checkAnswer(question, false)).toBe(true);
                expect(checkAnswer(question, true)).toBe(false);
            });
        });

        describe('keywords', () => {
            it('should return true for exact match (case insensitive)', () => {
                const question = createKeywords({answer: 'Paris', caseSensitive: false});
                expect(checkAnswer(question, 'Paris')).toBe(true);
                expect(checkAnswer(question, 'paris')).toBe(true);
                expect(checkAnswer(question, 'PARIS')).toBe(true);
                expect(checkAnswer(question, 'PaRiS')).toBe(true);
            });

            it('should return true for exact match (case sensitive)', () => {
                const question = createKeywords({answer: 'Paris', caseSensitive: true});
                expect(checkAnswer(question, 'Paris')).toBe(true);
                expect(checkAnswer(question, 'paris')).toBe(false);
                expect(checkAnswer(question, 'PARIS')).toBe(false);
            });

            it('should handle multiple acceptable answers', () => {
                const question = createKeywords({answer: ['Paris', 'paris', 'The City of Light'], caseSensitive: true});
                expect(checkAnswer(question, 'Paris')).toBe(true);
                expect(checkAnswer(question, 'paris')).toBe(true);
                expect(checkAnswer(question, 'The City of Light')).toBe(true);
                expect(checkAnswer(question, 'London')).toBe(false);
            });

            it('should trim whitespace', () => {
                const question = createKeywords({answer: 'Paris', caseSensitive: false});
                expect(checkAnswer(question, '  Paris  ')).toBe(true);
                expect(checkAnswer(question, '\tParis\n')).toBe(true);
            });

            it('should return false for incorrect answer', () => {
                const question = createKeywords({answer: 'Paris'});
                expect(checkAnswer(question, 'London')).toBe(false);
                expect(checkAnswer(question, '')).toBe(false);
            });
        });

        describe('matching', () => {
            const question = createMatching({
                pairs: [
                    {left: 'A', right: '1'},
                    {left: 'B', right: '2'},
                    {left: 'C', right: '3'}
                ]
            });

            it('should return true for all correct matches', () => {
                expect(checkAnswer(question, {'A': '1', 'B': '2', 'C': '3'})).toBe(true);
            });

            it('should return false for incorrect matches', () => {
                expect(checkAnswer(question, {'A': '2', 'B': '1', 'C': '3'})).toBe(false);
                expect(checkAnswer(question, {'A': '1', 'B': '3', 'C': '2'})).toBe(false);
            });

            it('should return false for missing matches', () => {
                expect(checkAnswer(question, {'A': '1', 'B': '2'})).toBe(false);
            });

            it('should return false for null/undefined/invalid answers', () => {
                expect(checkAnswer(question, null)).toBe(false);
                expect(checkAnswer(question, undefined)).toBe(false);
                expect(checkAnswer(question, 'invalid')).toBe(false);
                expect(checkAnswer(question, 123)).toBe(false);
            });
        });

        describe('word_bank', () => {
            const question = createWordBank({
                sentence: 'The _ is _ today.',
                answers: ['sky', 'blue']
            });

            it('should return true for correct words in correct order', () => {
                expect(checkAnswer(question, ['sky', 'blue'])).toBe(true);
            });

            it('should return false for wrong order', () => {
                expect(checkAnswer(question, ['blue', 'sky'])).toBe(false);
            });

            it('should return false for wrong words', () => {
                expect(checkAnswer(question, ['ground', 'blue'])).toBe(false);
                expect(checkAnswer(question, ['sky', 'red'])).toBe(false);
            });

            it('should return false for missing words', () => {
                expect(checkAnswer(question, ['sky'])).toBe(false);
            });

            it('should return false for non-array answer', () => {
                expect(checkAnswer(question, 'sky blue')).toBe(false);
                expect(checkAnswer(question, null)).toBe(false);
            });
        });

        describe('unknown type', () => {
            it('should return false for unknown question type', () => {
                const question = {
                    id: 'unknown',
                    type: 'unknown_type' as const,
                    topicId: 't1',
                    prompt: 'Unknown'
                } as unknown as Question;
                expect(checkAnswer(question, 'anything')).toBe(false);
            });
        });
    });
});
