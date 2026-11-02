import {v4 as uuidv4} from 'uuid';
import type {Question, QuestionType} from '../types';
import {hasDuplicateStrings, hasEnoughWordBankEntries} from './validationHelpers';

export const QUESTION_TYPES: {value: QuestionType; label: string}[] = [
    {value: 'multiple_choice', label: 'Multiple choice'},
    {value: 'multiple_answer', label: 'Multiple answer'},
    {value: 'true_false', label: 'True / false'},
    {value: 'keywords', label: 'Keywords'},
    {value: 'matching', label: 'Matching'},
    {value: 'word_bank', label: 'Word bank'}
];

export function createEmptyQuestion(topicId: string, type: QuestionType): Question {
    const id = uuidv4();
    const base = {id, topicId, prompt: 'New question'};
    switch (type) {
        case 'true_false':
            return {...base, type: 'true_false', answer: true};
        case 'multiple_choice':
            return {
                ...base,
                type: 'multiple_choice',
                choices: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
                answerIndex: 0
            };
        case 'multiple_answer':
            return {
                ...base,
                type: 'multiple_answer',
                choices: ['Option 1', 'Option 2', 'Option 3'],
                answerIndices: [0]
            };
        case 'keywords':
            return {...base, type: 'keywords', answer: 'answer', caseSensitive: false};
        case 'matching':
            return {
                ...base,
                type: 'matching',
                pairs: [
                    {left: 'Item 1', right: 'Match 1'},
                    {left: 'Item 2', right: 'Match 2'}
                ]
            };
        case 'word_bank':
            return {
                ...base,
                type: 'word_bank',
                sentence: 'The _ is a blank.',
                wordBank: ['word'],
                answers: ['word']
            };
    }
}

/**
 * The question converted to `newType`. The prompt, explanation, and media are kept, and so are the
 * choices and correct answers when switching between multiple choice and multiple answer.
 */
export function migrateQuestionShape(prev: Question, newType: QuestionType, topicId: string): Question {
    const base = {id: prev.id, topicId, prompt: prev.prompt, explanation: prev.explanation, media: prev.media};
    const choices = prev.type === 'multiple_choice' || prev.type === 'multiple_answer' ? [...prev.choices] : null;
    const correctIndices =
        prev.type === 'multiple_choice'
            ? [prev.answerIndex]
            : prev.type === 'multiple_answer'
              ? prev.answerIndices
              : [0];

    switch (newType) {
        case 'true_false':
            return {...base, type: 'true_false', answer: prev.type === 'true_false' ? prev.answer : true};
        case 'multiple_choice':
            return {
                ...base,
                type: 'multiple_choice',
                choices: choices ?? ['', '', '', ''],
                answerIndex: correctIndices[0] ?? 0
            };
        case 'multiple_answer':
            return {
                ...base,
                type: 'multiple_answer',
                choices: choices ?? ['', '', ''],
                answerIndices: [...correctIndices]
            };
        case 'keywords':
            return {
                ...base,
                type: 'keywords',
                answer: prev.type === 'keywords' ? prev.answer : '',
                caseSensitive: prev.type === 'keywords' ? prev.caseSensitive : false
            };
        case 'matching':
            return {
                ...base,
                type: 'matching',
                pairs:
                    prev.type === 'matching'
                        ? prev.pairs
                        : [
                              {left: '', right: ''},
                              {left: '', right: ''}
                          ]
            };
        case 'word_bank':
            return {
                ...base,
                type: 'word_bank',
                sentence: prev.type === 'word_bank' ? prev.sentence : 'The _ is a blank.',
                wordBank: prev.type === 'word_bank' ? [...prev.wordBank] : ['word'],
                answers: prev.type === 'word_bank' ? [...prev.answers] : ['word']
            };
    }
}

/**
 * Why a question cannot be saved yet, or null when it is ready.
 */
export function getQuestionDraftError(question: Question): string | null {
    if (!question.prompt.trim()) return 'Prompt is required.';

    switch (question.type) {
        case 'multiple_choice':
            if (question.choices.length < 2 || question.choices.some((choice) => !choice.trim())) {
                return 'Multiple choice questions need at least two filled choices.';
            }
            if (question.answerIndex < 0 || question.answerIndex >= question.choices.length) {
                return 'Choose a valid correct answer.';
            }
            return null;

        case 'multiple_answer': {
            if (question.choices.length < 2 || question.choices.some((choice) => !choice.trim())) {
                return 'Multiple answer questions need at least two filled choices.';
            }
            const uniqueAnswers = new Set(question.answerIndices);
            const answerInRange = question.answerIndices.every(
                (index) => Number.isInteger(index) && index >= 0 && index < question.choices.length
            );
            if (
                question.answerIndices.length === 0 ||
                uniqueAnswers.size !== question.answerIndices.length ||
                !answerInRange
            ) {
                return 'Choose at least one valid correct answer.';
            }
            return null;
        }

        case 'keywords': {
            const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
            return answers.length > 0 && answers.every((answer) => answer.trim())
                ? null
                : 'Add at least one accepted answer.';
        }

        case 'true_false':
            return null;

        case 'matching': {
            const leftValues = question.pairs.map((pair) => pair.left);
            const rightValues = question.pairs.map((pair) => pair.right);
            if (question.pairs.length === 0 || [...leftValues, ...rightValues].some((value) => !value.trim())) {
                return 'Matching questions need filled left and right values.';
            }
            if (hasDuplicateStrings(leftValues) || hasDuplicateStrings(rightValues)) {
                return 'Matching left and right values must be unique.';
            }
            return null;
        }

        case 'word_bank': {
            const blankCount = question.sentence.split('_').length - 1;
            if (!question.sentence.trim() || blankCount === 0) {
                return 'Add a sentence with at least one blank.';
            }
            if (question.wordBank.length === 0 || question.wordBank.some((word) => !word.trim())) {
                return 'Add at least one filled word bank entry.';
            }
            if (question.answers.length !== blankCount || question.answers.some((answer) => !answer.trim())) {
                return 'Add one filled answer for each blank.';
            }
            if (!hasEnoughWordBankEntries(question.wordBank, question.answers)) {
                return 'Each answer must appear in the word bank enough times.';
            }
            return null;
        }
    }
}
