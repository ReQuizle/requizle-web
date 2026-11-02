import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {useQuizStore} from '../store/useQuizStore';
import type {Subject} from '../types';
import {ContentEditor} from './ContentEditor';

vi.mock('../utils/useResolvedMediaUrl', () => ({
    useResolvedMediaUrl: () => ({resolvedUrl: null, isVideo: false, loading: false, error: false})
}));

const subject: Subject = {
    id: 's1',
    name: 'Biology',
    topics: [
        {
            id: 't1',
            name: 'Cells',
            questions: [
                {
                    id: 'q1',
                    topicId: 't1',
                    type: 'word_bank',
                    prompt: 'Fill in the blank',
                    sentence: 'The _ is the powerhouse of the cell.',
                    wordBank: ['mitochondria'],
                    answers: ['mitochondria']
                },
                {
                    id: 'q2',
                    topicId: 't1',
                    type: 'multiple_answer',
                    prompt: 'Which are organelles?',
                    choices: ['Nucleus', 'Ribosome', 'Protein'],
                    answerIndices: [0, 1]
                }
            ]
        }
    ]
};

function storedQuestion(id: string) {
    const state = useQuizStore.getState();
    return state.profiles[state.activeProfileId].subjects[0].topics[0].questions.find((q) => q.id === id);
}

beforeEach(() => {
    useQuizStore.setState((state) => ({
        profiles: {
            ...state.profiles,
            [state.activeProfileId]: {...state.profiles[state.activeProfileId], subjects: [subject]}
        }
    }));
});

describe('ContentEditor', () => {
    it('keeps a typed comma in the word bank so a second word can be added', () => {
        render(<ContentEditor />);
        fireEvent.click(screen.getByRole('button', {name: /Fill in the blank/}));
        const wordBank = screen.getByLabelText('Word bank (comma-separated)');

        fireEvent.change(wordBank, {target: {value: 'mitochondria,'}});
        expect(wordBank).toHaveValue('mitochondria,');

        fireEvent.change(wordBank, {target: {value: 'mitochondria, nucleus'}});
        fireEvent.click(screen.getByRole('button', {name: 'Save question'}));

        expect(storedQuestion('q1')).toMatchObject({wordBank: ['mitochondria', 'nucleus']});
    });

    it('does not save a question that is not valid yet, and says why', () => {
        render(<ContentEditor />);
        fireEvent.click(screen.getByRole('button', {name: /Which are organelles/}));

        fireEvent.click(screen.getByRole('checkbox', {name: 'Choice 1 is correct'}));
        fireEvent.click(screen.getByRole('checkbox', {name: 'Choice 2 is correct'}));
        fireEvent.click(screen.getByRole('button', {name: 'Save question'}));

        expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one valid correct answer.');
        expect(storedQuestion('q2')).toMatchObject({answerIndices: [0, 1]});
    });

    it('renumbers the correct answers when a choice is removed', () => {
        render(<ContentEditor />);
        fireEvent.click(screen.getByRole('button', {name: /Which are organelles/}));

        fireEvent.click(screen.getByRole('button', {name: 'Remove choice 1'}));
        fireEvent.click(screen.getByRole('button', {name: 'Save question'}));

        expect(storedQuestion('q2')).toMatchObject({choices: ['Ribosome', 'Protein'], answerIndices: [0]});
    });

    it('adds a question of the chosen type and opens it', () => {
        render(<ContentEditor />);

        fireEvent.change(screen.getByRole('combobox', {name: 'Add question'}), {target: {value: 'true_false'}});

        expect(screen.getByRole('combobox', {name: 'Type'})).toHaveValue('true_false');
        expect(screen.getByLabelText('Prompt')).toHaveValue('New question');
    });

    it('renames the topic from its name field', () => {
        render(<ContentEditor />);
        const nameField = screen.getByRole('textbox', {name: 'Topic name'});

        fireEvent.change(nameField, {target: {value: 'Cell biology'}});
        fireEvent.submit(nameField);

        expect(screen.getByRole('button', {name: /Cell biology/})).toBeInTheDocument();
    });

    it('deletes a question after confirming', () => {
        render(<ContentEditor />);
        fireEvent.click(screen.getByRole('button', {name: /Fill in the blank/}));

        fireEvent.click(screen.getByRole('button', {name: 'Delete selected question'}));
        const dialog = screen.getByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', {name: 'Delete'}));

        expect(storedQuestion('q1')).toBeUndefined();
    });
});
