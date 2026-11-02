import {describe, it, expect} from 'vitest';
import {render} from '@testing-library/react';
import {MathFormula} from './MathFormula';

describe('MathFormula', () => {
    it('renders inline math with KaTeX', () => {
        const {container} = render(<MathFormula math="x^2" />);
        expect(container.querySelector('span > .katex')).toBeInTheDocument();
        expect(container.querySelector('.katex-display')).not.toBeInTheDocument();
    });

    it('renders block math in display mode', () => {
        const {container} = render(<MathFormula math="\frac{a}{b}" block />);
        expect(container.querySelector('div > .katex-display')).toBeInTheDocument();
    });

    it('shows invalid expressions as an error instead of throwing', () => {
        const {container} = render(<MathFormula math="\frac{" />);
        expect(container.querySelector('.katex-error')).toHaveTextContent(String.raw`\frac{`);
    });
});
