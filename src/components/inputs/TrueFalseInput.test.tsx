import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {TrueFalseInput} from './TrueFalseInput';
import type {TrueFalseQuestion} from '../../types';

describe('TrueFalseInput', () => {
    const mockOnAnswer = vi.fn();

    const createQuestion = (overrides: Partial<TrueFalseQuestion> = {}): TrueFalseQuestion => ({
        id: 'tf1',
        type: 'true_false',
        topicId: 't1',
        prompt: 'The sky is blue.',
        answer: true,
        ...overrides
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render True and False buttons', () => {
        render(<TrueFalseInput question={createQuestion()} onAnswer={mockOnAnswer} />);

        expect(screen.getByText('True')).toBeInTheDocument();
        expect(screen.getByText('False')).toBeInTheDocument();
    });

    it('should call onAnswer with true when True is clicked', () => {
        render(<TrueFalseInput question={createQuestion()} onAnswer={mockOnAnswer} />);

        fireEvent.click(screen.getByText('True'));
        expect(mockOnAnswer).toHaveBeenCalledWith(true);
    });

    it('should call onAnswer with false when False is clicked', () => {
        render(<TrueFalseInput question={createQuestion()} onAnswer={mockOnAnswer} />);

        fireEvent.click(screen.getByText('False'));
        expect(mockOnAnswer).toHaveBeenCalledWith(false);
    });

    it('should not call onAnswer after answer is submitted', () => {
        render(<TrueFalseInput question={createQuestion()} onAnswer={mockOnAnswer} submittedAnswer={true} />);

        fireEvent.click(screen.getByText('False'));
        expect(mockOnAnswer).not.toHaveBeenCalled();
    });

    it('should render both buttons even when answer is submitted', () => {
        const {container} = render(
            <TrueFalseInput question={createQuestion({answer: true})} onAnswer={mockOnAnswer} submittedAnswer={false} />
        );

        const buttons = container.querySelectorAll('button');
        expect(buttons).toHaveLength(2);
    });
});
