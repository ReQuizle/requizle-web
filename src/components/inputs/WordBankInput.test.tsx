import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {WordBankInput} from './WordBankInput';
import type {WordBankQuestion} from '../../types';

describe('WordBankInput', () => {
    const mockOnAnswer = vi.fn();

    const createQuestion = (overrides: Partial<WordBankQuestion> = {}): WordBankQuestion => ({
        id: 'wb1',
        type: 'word_bank',
        topicId: 't1',
        prompt: 'Fill in the blanks',
        sentence: 'The _ is _ today.',
        wordBank: ['sky', 'blue', 'red', 'green'],
        answers: ['sky', 'blue'],
        ...overrides
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the sentence with blanks', () => {
        render(
            <WordBankInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        expect(screen.getByText(/The/)).toBeInTheDocument();
        expect(screen.getByText(/today/)).toBeInTheDocument();
    });

    it('should render word bank header', () => {
        render(
            <WordBankInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        expect(screen.getByText('Word Bank')).toBeInTheDocument();
    });

    it('should render all word bank words', () => {
        render(
            <WordBankInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        expect(screen.getByText('sky')).toBeInTheDocument();
        expect(screen.getByText('blue')).toBeInTheDocument();
        expect(screen.getByText('red')).toBeInTheDocument();
        expect(screen.getByText('green')).toBeInTheDocument();
    });

    it('should render submit button', () => {
        render(
            <WordBankInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        expect(screen.getByText('Submit Answer')).toBeInTheDocument();
    });

    it('should disable submit button when blanks are not filled', () => {
        render(
            <WordBankInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        const submitButton = screen.getByText('Submit Answer');
        expect(submitButton).toBeDisabled();
    });

    it('should move word to slot when clicked', () => {
        render(
            <WordBankInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('sky'));

        expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
        expect(screen.getByText('sky')).toBeInTheDocument();
    });

    it('should fill blanks and submit answer', () => {
        render(
            <WordBankInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('sky'));

        fireEvent.click(screen.getByText('blue'));

        const submitButton = screen.getByText('Submit Answer');
        expect(submitButton).not.toBeDisabled();

        fireEvent.click(submitButton);
        expect(mockOnAnswer).toHaveBeenCalledWith(['sky', 'blue']);
    });

    it('should remove word from slot when slot is clicked', () => {
        render(
            <WordBankInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('sky'));

        const skyButton = screen.getByText('sky');
        fireEvent.click(skyButton);

        const submitButton = screen.getByText('Submit Answer');
        expect(submitButton).toBeDisabled();
    });

    it('should not allow interaction when disabled', () => {
        render(
            <WordBankInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={true}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('sky'));

        const submitButton = screen.getByText('Submit Answer');
        expect(submitButton).toBeDisabled();
    });

    it('should display submitted answer', () => {
        render(
            <WordBankInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={true}
                submittedAnswer={['sky', 'blue']}
            />
        );

        expect(screen.getByText('sky')).toBeInTheDocument();
        expect(screen.getByText('blue')).toBeInTheDocument();
    });

    it('should handle sentence with multiple blanks', () => {
        render(
            <WordBankInput
                question={createQuestion({
                    sentence: 'A _ _ _ walks into a bar.',
                    wordBank: ['horse', 'zebra', 'fish', 'dog'],
                    answers: ['horse', 'zebra', 'fish']
                })}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('horse'));
        fireEvent.click(screen.getByText('zebra'));
        fireEvent.click(screen.getByText('fish'));

        fireEvent.click(screen.getByText('Submit Answer'));
        expect(mockOnAnswer).toHaveBeenCalledWith(['horse', 'zebra', 'fish']);
    });
});
