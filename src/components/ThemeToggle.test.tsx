import {describe, it, expect, vi} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {ThemeToggle} from './ThemeToggle';

const mockToggleTheme = vi.fn();
vi.mock('../context/ThemeContext', () => ({
    useTheme: () => ({
        theme: 'light',
        toggleTheme: mockToggleTheme
    })
}));

describe('ThemeToggle', () => {
    it('should render toggle button', () => {
        render(<ThemeToggle />);

        const button = screen.getByRole('button', {name: /toggle theme/i});
        expect(button).toBeInTheDocument();
    });

    it('should call toggleTheme when clicked', () => {
        render(<ThemeToggle />);

        const button = screen.getByRole('button', {name: /toggle theme/i});
        fireEvent.click(button);

        expect(mockToggleTheme).toHaveBeenCalled();
    });

    it('should have accessible aria-label', () => {
        render(<ThemeToggle />);

        const button = screen.getByLabelText('Toggle theme');
        expect(button).toBeInTheDocument();
    });
});
