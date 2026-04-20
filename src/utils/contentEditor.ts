import {v4 as uuidv4} from 'uuid';
import type {Question, QuestionType} from '../types';

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
    const base = {id, topicId, prompt: '', explanation: '' as string | undefined};
    switch (type) {
        case 'true_false':
            return {...base, type: 'true_false', answer: true};
        case 'multiple_choice':
            return {...base, type: 'multiple_choice', choices: ['', '', '', ''], answerIndex: 0};
        case 'multiple_answer':
            return {...base, type: 'multiple_answer', choices: ['', '', ''], answerIndices: [0]};
        case 'keywords':
            return {...base, type: 'keywords', answer: '', caseSensitive: false};
        case 'matching':
            return {
                ...base,
                type: 'matching',
                pairs: [
                    {left: '', right: ''},
                    {left: '', right: ''}
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

export function migrateQuestionShape(prev: Question, newType: QuestionType, topicId: string): Question {
    const id = prev.id;
    const prompt = prev.prompt;
    const explanation = prev.explanation;
    const media = prev.media;
    const base = {id, topicId, prompt, explanation, media};
    switch (newType) {
        case 'true_false':
            return {...base, type: 'true_false', answer: prev.type === 'true_false' ? prev.answer : true};
        case 'multiple_choice': {
            let choices = ['', '', '', ''];
            if (prev.type === 'multiple_choice') choices = [...prev.choices];
            else if (prev.type === 'multiple_answer') choices = [...prev.choices, '', ''].slice(0, 4);
            return {...base, type: 'multiple_choice', choices, answerIndex: 0};
        }
        case 'multiple_answer': {
            let choices = ['', '', ''];
            if (prev.type === 'multiple_answer') {
                choices = [...prev.choices];
            } else if (prev.type === 'multiple_choice') {
                choices = [...prev.choices];
            }
            return {...base, type: 'multiple_answer', choices, answerIndices: [0]};
        }
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
