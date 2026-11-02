import {describe, expect, it} from 'vitest';
import type {Question} from '../types';
import {createEmptyQuestion, getQuestionDraftError, migrateQuestionShape} from './contentEditor';

const base = {id: 'q1', topicId: 't1', prompt: 'Question?'};

describe('getQuestionDraftError', () => {
    it('accepts a new question of every type', () => {
        for (const type of [
            'multiple_choice',
            'multiple_answer',
            'true_false',
            'keywords',
            'matching',
            'word_bank'
        ] as const) {
            expect(getQuestionDraftError(createEmptyQuestion('t1', type)), type).toBeNull();
        }
    });

    it.each<[string, Question]>([
        ['Prompt is required.', {...base, prompt: '  ', type: 'true_false', answer: true}],
        [
            'Multiple choice questions need at least two filled choices.',
            {...base, type: 'multiple_choice', choices: ['A', ' '], answerIndex: 0}
        ],
        ['Choose a valid correct answer.', {...base, type: 'multiple_choice', choices: ['A', 'B'], answerIndex: 2}],
        [
            'Choose at least one valid correct answer.',
            {...base, type: 'multiple_answer', choices: ['A', 'B'], answerIndices: []}
        ],
        [
            'Choose at least one valid correct answer.',
            {...base, type: 'multiple_answer', choices: ['A', 'B'], answerIndices: [1, 1]}
        ],
        ['Add at least one accepted answer.', {...base, type: 'keywords', answer: ['cat', '']}],
        [
            'Matching left and right values must be unique.',
            {
                ...base,
                type: 'matching',
                pairs: [
                    {left: 'A', right: '1'},
                    {left: 'A ', right: '2'}
                ]
            }
        ],
        [
            'Add a sentence with at least one blank.',
            {...base, type: 'word_bank', sentence: 'No blanks', wordBank: ['x'], answers: []}
        ],
        [
            'Add one filled answer for each blank.',
            {...base, type: 'word_bank', sentence: '_ and _', wordBank: ['a', 'b'], answers: ['a']}
        ],
        [
            'Each answer must appear in the word bank enough times.',
            {...base, type: 'word_bank', sentence: '_ and _', wordBank: ['a', 'b'], answers: ['a', 'a']}
        ]
    ])('reports "%s"', (message, question) => {
        expect(getQuestionDraftError(question)).toBe(message);
    });
});

describe('migrateQuestionShape', () => {
    it('keeps the prompt, explanation, and media when the type changes', () => {
        const question: Question = {
            ...base,
            type: 'true_false',
            answer: false,
            explanation: 'Because.',
            media: 'idb:abc'
        };

        const migrated = migrateQuestionShape(question, 'keywords', 't2');

        expect(migrated).toMatchObject({
            id: 'q1',
            topicId: 't2',
            type: 'keywords',
            prompt: 'Question?',
            explanation: 'Because.',
            media: 'idb:abc'
        });
    });

    it('keeps the choices and correct answer when switching to multiple answer', () => {
        const question: Question = {...base, type: 'multiple_choice', choices: ['A', 'B', 'C'], answerIndex: 2};

        expect(migrateQuestionShape(question, 'multiple_answer', 't1')).toMatchObject({
            choices: ['A', 'B', 'C'],
            answerIndices: [2]
        });
    });

    it('keeps every choice and the first correct answer when switching to multiple choice', () => {
        const question: Question = {
            ...base,
            type: 'multiple_answer',
            choices: ['A', 'B', 'C', 'D', 'E'],
            answerIndices: [3, 1]
        };

        const migrated = migrateQuestionShape(question, 'multiple_choice', 't1');

        expect(migrated).toMatchObject({choices: ['A', 'B', 'C', 'D', 'E'], answerIndex: 3});
        expect(getQuestionDraftError(migrated)).toBeNull();
    });

    it('starts with blank choices when switching from another type', () => {
        const question: Question = {...base, type: 'true_false', answer: true};

        expect(migrateQuestionShape(question, 'multiple_choice', 't1')).toMatchObject({
            choices: ['', '', '', ''],
            answerIndex: 0
        });
    });
});
