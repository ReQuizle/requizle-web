import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {KeywordsInput} from './KeywordsInput';

describe('KeywordsInput', () => {
    const mockOnAnswer = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render input field', () => {
        render(<KeywordsInput onAnswer={mockOnAnswer} />);

        expect(screen.getByPlaceholderText('Type your answer here...')).toBeInTheDocument();
    });

    it('should call onAnswer when form is submitted', () => {
        render(<KeywordsInput onAnswer={mockOnAnswer} />);

        const input = screen.getByPlaceholderText('Type your answer here...');
        fireEvent.change(input, {target: {value: 'Paris'}});
        fireEvent.submit(input.closest('form')!);

        expect(mockOnAnswer).toHaveBeenCalledWith('Paris');
    });

    it('should trim whitespace from answer', () => {
        render(<KeywordsInput onAnswer={mockOnAnswer} />);

        const input = screen.getByPlaceholderText('Type your answer here...');
        fireEvent.change(input, {target: {value: '  Paris  '}});
        fireEvent.submit(input.closest('form')!);

        expect(mockOnAnswer).toHaveBeenCalledWith('Paris');
    });

    it('should not submit empty answer', () => {
        render(<KeywordsInput onAnswer={mockOnAnswer} />);

        const input = screen.getByPlaceholderText('Type your answer here...');
        fireEvent.change(input, {target: {value: '   '}});
        fireEvent.submit(input.closest('form')!);

        expect(mockOnAnswer).not.toHaveBeenCalled();
    });

    it('should show the submitted answer and lock the input', () => {
        render(<KeywordsInput onAnswer={mockOnAnswer} submittedAnswer="London" />);

        const input = screen.getByPlaceholderText('Type your answer here...') as HTMLInputElement;
        expect(input.value).toBe('London');
        expect(input).toBeDisabled();
    });

    it('should disable submit button when input is empty', () => {
        render(<KeywordsInput onAnswer={mockOnAnswer} />);

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
    });

    it('should enable submit button when input has value', () => {
        render(<KeywordsInput onAnswer={mockOnAnswer} />);

        const input = screen.getByPlaceholderText('Type your answer here...');
        fireEvent.change(input, {target: {value: 'Paris'}});

        const button = screen.getByRole('button');
        expect(button).not.toBeDisabled();
    });
});
