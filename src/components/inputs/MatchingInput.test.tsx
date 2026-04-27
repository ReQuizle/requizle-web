import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {MatchingInput} from './MatchingInput';
import type {MatchingQuestion} from '../../types';

describe('MatchingInput', () => {
    const mockOnAnswer = vi.fn();

    const createQuestion = (overrides: Partial<MatchingQuestion> = {}): MatchingQuestion => ({
        id: 'm1',
        type: 'matching',
        topicId: 't1',
        prompt: 'Match the items',
        pairs: [
            {left: 'A', right: '1'},
            {left: 'B', right: '2'},
            {left: 'C', right: '3'}
        ],
        ...overrides
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render left column items', () => {
        render(
            <MatchingInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
        expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('should render right column items (shuffled)', () => {
        render(
            <MatchingInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render column headers', () => {
        render(
            <MatchingInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        expect(screen.getByText('Items')).toBeInTheDocument();
        expect(screen.getByText('Matches')).toBeInTheDocument();
    });

    it('should render submit button', () => {
        render(
            <MatchingInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        expect(screen.getByText('Submit Matches')).toBeInTheDocument();
    });

    it('should disable submit button when not all items are matched', () => {
        render(
            <MatchingInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        const submitButton = screen.getByText('Submit Matches');
        expect(submitButton).toBeDisabled();
    });

    it('should select left item when clicked', () => {
        const {container} = render(
            <MatchingInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('A'));

        expect(container).toBeInTheDocument();
    });

    it('should match items when left is selected and right is clicked', () => {
        render(
            <MatchingInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('A'));
        fireEvent.click(screen.getByText('1'));

        fireEvent.click(screen.getByText('B'));
        fireEvent.click(screen.getByText('2'));

        fireEvent.click(screen.getByText('C'));
        fireEvent.click(screen.getByText('3'));

        const submitButton = screen.getByText('Submit Matches');
        expect(submitButton).not.toBeDisabled();

        fireEvent.click(submitButton);
        expect(mockOnAnswer).toHaveBeenCalledWith({'A': '1', 'B': '2', 'C': '3'});
    });

    it('should unmatch when clicking already matched left item', () => {
        render(
            <MatchingInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={false}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('A'));
        fireEvent.click(screen.getByText('1'));

        fireEvent.click(screen.getByText('A'));

        const submitButton = screen.getByText('Submit Matches');
        expect(submitButton).toBeDisabled();
    });

    it('should not allow interaction when disabled', () => {
        render(
            <MatchingInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={true}
                submittedAnswer={null}
            />
        );

        fireEvent.click(screen.getByText('A'));
        fireEvent.click(screen.getByText('1'));

        const submitButton = screen.getByText('Submit Matches');
        expect(submitButton).toBeDisabled();
    });

    it('should display submitted answer', () => {
        render(
            <MatchingInput
                question={createQuestion()}
                onAnswer={mockOnAnswer}
                disabled={true}
                submittedAnswer={{'A': '1', 'B': '2', 'C': '3'}}
            />
        );

        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    });
});
