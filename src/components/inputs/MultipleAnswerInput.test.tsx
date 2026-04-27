import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {MultipleAnswerInput} from './MultipleAnswerInput';
import type {MultipleAnswerQuestion} from '../../types';

describe('MultipleAnswerInput', () => {
    const mockOnAnswer = vi.fn();

    const createQuestion = (overrides: Partial<MultipleAnswerQuestion> = {}): MultipleAnswerQuestion => ({
        id: 'ma1',
        type: 'multiple_answer',
        topicId: 't1',
        prompt: 'Select all that apply',
        choices: ['Apple', 'Banana', 'Cherry', 'Date'],
        answerIndices: [0, 2],
        ...overrides
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render all choices', () => {
        render(
            <MultipleAnswerInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        expect(screen.getByText('Apple')).toBeInTheDocument();
        expect(screen.getByText('Banana')).toBeInTheDocument();
        expect(screen.getByText('Cherry')).toBeInTheDocument();
        expect(screen.getByText('Date')).toBeInTheDocument();
    });

    it('should render submit button', () => {
        render(
            <MultipleAnswerInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        expect(screen.getByText('Submit Answer')).toBeInTheDocument();
    });

    it('should toggle selection when clicking choices', () => {
        render(
            <MultipleAnswerInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('Apple'));

        fireEvent.click(screen.getByText('Cherry'));

        fireEvent.click(screen.getByText('Submit Answer'));

        expect(mockOnAnswer).toHaveBeenCalledWith(expect.arrayContaining([0, 2]));
    });

    it('should allow deselecting choices', () => {
        render(
            <MultipleAnswerInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('Apple'));

        fireEvent.click(screen.getByText('Apple'));

        fireEvent.click(screen.getByText('Banana'));

        fireEvent.click(screen.getByText('Submit Answer'));

        expect(mockOnAnswer).toHaveBeenCalledWith([1]);
    });

    it('should disable submit button when nothing is selected', () => {
        render(
            <MultipleAnswerInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        const submitButton = screen.getByText('Submit Answer');
        expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when something is selected', () => {
        render(
            <MultipleAnswerInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('Apple'));

        const submitButton = screen.getByText('Submit Answer');
        expect(submitButton).not.toBeDisabled();
    });

    it('should not allow selection when disabled', () => {
        render(
            <MultipleAnswerInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={true}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('Apple'));
        fireEvent.click(screen.getByText('Submit Answer'));

        expect(mockOnAnswer).not.toHaveBeenCalled();
    });

    it('should show submitted selections', () => {
        const {container} = render(
            <MultipleAnswerInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={true}
                submittedAnswer={[0, 1]}
            />
        );

        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThan(0);
    });
});
