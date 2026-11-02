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
        render(<MultipleAnswerInput question={createQuestion()} onAnswer={mockOnAnswer} />);

        expect(screen.getByText('Apple')).toBeInTheDocument();
        expect(screen.getByText('Banana')).toBeInTheDocument();
        expect(screen.getByText('Cherry')).toBeInTheDocument();
        expect(screen.getByText('Date')).toBeInTheDocument();
    });

    it('should render submit button', () => {
        render(<MultipleAnswerInput question={createQuestion()} onAnswer={mockOnAnswer} />);

        expect(screen.getByText('Submit answer')).toBeInTheDocument();
    });

    it('should toggle selection when clicking choices', () => {
        render(<MultipleAnswerInput question={createQuestion()} onAnswer={mockOnAnswer} />);

        fireEvent.click(screen.getByText('Apple'));

        fireEvent.click(screen.getByText('Cherry'));

        fireEvent.click(screen.getByText('Submit answer'));

        expect(mockOnAnswer).toHaveBeenCalledWith(expect.arrayContaining([0, 2]));
    });

    it('should allow deselecting choices', () => {
        render(<MultipleAnswerInput question={createQuestion()} onAnswer={mockOnAnswer} />);

        fireEvent.click(screen.getByText('Apple'));

        fireEvent.click(screen.getByText('Apple'));

        fireEvent.click(screen.getByText('Banana'));

        fireEvent.click(screen.getByText('Submit answer'));

        expect(mockOnAnswer).toHaveBeenCalledWith([1]);
    });

    it('should disable submit button when nothing is selected', () => {
        render(<MultipleAnswerInput question={createQuestion()} onAnswer={mockOnAnswer} />);

        const submitButton = screen.getByText('Submit answer');
        expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when something is selected', () => {
        render(<MultipleAnswerInput question={createQuestion()} onAnswer={mockOnAnswer} />);

        fireEvent.click(screen.getByText('Apple'));

        const submitButton = screen.getByText('Submit answer');
        expect(submitButton).not.toBeDisabled();
    });

    it('should not change the selection after submitting', () => {
        render(<MultipleAnswerInput question={createQuestion()} onAnswer={mockOnAnswer} submittedAnswer={[1]} />);

        fireEvent.click(screen.getByText('Apple'));
        fireEvent.click(screen.getByText('Submit answer'));

        expect(screen.getByText('Apple').closest('button')!.firstElementChild).not.toHaveClass('text-indigo-600');
        expect(mockOnAnswer).not.toHaveBeenCalled();
    });

    it('should mark correct, wrong, and missed choices after submitting', () => {
        render(<MultipleAnswerInput question={createQuestion()} onAnswer={mockOnAnswer} submittedAnswer={[0, 1]} />);

        const choice = (text: string) => screen.getByText(text).closest('button')!;
        expect(choice('Apple').firstElementChild).toHaveClass('text-green-600');
        expect(choice('Apple').firstElementChild).not.toHaveClass('text-indigo-600');
        expect(choice('Banana').firstElementChild).toHaveClass('text-red-700');
        expect(choice('Cherry')).toHaveClass('border-dashed');
        expect(choice('Date')).toHaveClass('text-slate-500');
    });
});
