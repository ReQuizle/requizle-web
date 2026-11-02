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
    it('names the theme it switches to and switches when clicked', () => {
        render(<ThemeToggle />);

        fireEvent.click(screen.getByRole('button', {name: 'Switch to dark theme'}));

        expect(mockToggleTheme).toHaveBeenCalled();
    });
});
