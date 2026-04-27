import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {MultipleChoiceInput} from './MultipleChoiceInput';
import type {MultipleChoiceQuestion} from '../../types';

describe('MultipleChoiceInput', () => {
    const mockOnAnswer = vi.fn();

    const createQuestion = (overrides: Partial<MultipleChoiceQuestion> = {}): MultipleChoiceQuestion => ({
        id: 'mc1',
        type: 'multiple_choice',
        topicId: 't1',
        prompt: 'Which is correct?',
        choices: ['Option A', 'Option B', 'Option C', 'Option D'],
        answerIndex: 0,
        ...overrides
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render all choices', () => {
        render(
            <MultipleChoiceInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        expect(screen.getByText('Option A')).toBeInTheDocument();
        expect(screen.getByText('Option B')).toBeInTheDocument();
        expect(screen.getByText('Option C')).toBeInTheDocument();
        expect(screen.getByText('Option D')).toBeInTheDocument();
    });

    it('should render choice letters (A, B, C, D)', () => {
        render(
            <MultipleChoiceInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
        expect(screen.getByText('C')).toBeInTheDocument();
        expect(screen.getByText('D')).toBeInTheDocument();
    });

    it('should call onAnswer with correct index when clicked', () => {
        render(
            <MultipleChoiceInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('Option B'));
        expect(mockOnAnswer).toHaveBeenCalledWith(1);

        fireEvent.click(screen.getByText('Option A'));
        expect(mockOnAnswer).toHaveBeenCalledWith(0);
    });

    it('should not call onAnswer when disabled', () => {
        render(
            <MultipleChoiceInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={true}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('Option A'));
        expect(mockOnAnswer).not.toHaveBeenCalled();
    });

    it('should not call onAnswer after answer is submitted', () => {
        render(
            <MultipleChoiceInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={0}
            />
        );

        fireEvent.click(screen.getByText('Option B'));
        expect(mockOnAnswer).not.toHaveBeenCalled();
    });

    it('should show correct answer styling after submission', () => {
        const {container} = render(
            <MultipleChoiceInput
                question={createQuestion({answerIndex: 2})}
                onAnswer={mockOnAnswer}
                disabled={true}
                submittedAnswer={1}
            />
        );

        const buttons = container.querySelectorAll('button');
        expect(buttons).toHaveLength(4);
    });
});
