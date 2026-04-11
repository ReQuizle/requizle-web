/**
 * Tests for Latex component
 * Tests math delimiters parsing, code blocks, and inline code rendering
 */
import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {Latex} from './Latex';

// Mock react-katex to avoid actual KaTeX rendering in tests
vi.mock('react-katex', () => ({
    InlineMath: ({math}: {math: string}) => <span data-testid="inline-math">{`[INLINE:${math}]`}</span>,
    BlockMath: ({math}: {math: string}) => <div data-testid="block-math">{`[BLOCK:${math}]`}</div>
}));

describe('Latex', () => {
    describe('plain text', () => {
        it('should render plain text without math', () => {
            render(<Latex>Hello world</Latex>);

            expect(screen.getByText('Hello world')).toBeInTheDocument();
        });

        it('should render empty content safely', () => {
            const {container} = render(<Latex>{''}</Latex>);

            expect(container.firstChild).toBeNull();
        });

        it('should preserve dollar signs in plain text', () => {
            render(<Latex>The price is $50 and $100</Latex>);

            expect(screen.getByText('The price is $50 and $100')).toBeInTheDocument();
        });

        it('should apply className to wrapper', () => {
            const {container} = render(<Latex className="custom-class">Hello</Latex>);

            expect(container.firstChild).toHaveClass('custom-class');
        });
    });

    describe('inline math \\\\(...\\\\)', () => {
        it('should render inline math', () => {
            render(<Latex>{'The formula is \\(x^2\\)'}</Latex>);

            expect(screen.getByTestId('inline-math')).toHaveTextContent('[INLINE:x^2]');
        });

        it('should render multiple inline math expressions', () => {
            render(<Latex>{'\\(a\\) and \\(b\\) are variables'}</Latex>);

            const inlineElements = screen.getAllByTestId('inline-math');
            expect(inlineElements).toHaveLength(2);
            expect(inlineElements[0]).toHaveTextContent('[INLINE:a]');
            expect(inlineElements[1]).toHaveTextContent('[INLINE:b]');
        });

        it('should handle complex inline math', () => {
            render(<Latex>{'Calculate \\(\\frac{a}{b} + \\sqrt{c}\\)'}</Latex>);

            expect(screen.getByTestId('inline-math')).toHaveTextContent('[INLINE:\\frac{a}{b} + \\sqrt{c}]');
        });

        it('should preserve text around inline math', () => {
            render(<Latex>{'Before \\(x\\) after'}</Latex>);

            expect(screen.getByText('Before')).toBeInTheDocument();
            expect(screen.getByText('after')).toBeInTheDocument();
            expect(screen.getByTestId('inline-math')).toBeInTheDocument();
        });
    });

    describe('block math \\\\[...\\\\]', () => {
        it('should render block math', () => {
            render(<Latex>{'Check this: \\[E = mc^2\\]'}</Latex>);

            expect(screen.getByTestId('block-math')).toHaveTextContent('[BLOCK:E = mc^2]');
        });

        it('should render multiple block math expressions', () => {
            render(<Latex>{'\\[a^2\\] and \\[b^2\\]'}</Latex>);

            const blockElements = screen.getAllByTestId('block-math');
            expect(blockElements).toHaveLength(2);
        });

        it('should handle multiline block math', () => {
            render(<Latex>{'\\[a + b\\]'}</Latex>);

            expect(screen.getByTestId('block-math')).toHaveTextContent('[BLOCK:a + b]');
        });
    });

    describe('mixed content', () => {
        it('should handle inline and block math together', () => {
            render(<Latex>{'Text with \\(inline\\) and block: \\[block\\] more text'}</Latex>);

            expect(screen.getByTestId('inline-math')).toHaveTextContent('[INLINE:inline]');
            expect(screen.getByTestId('block-math')).toHaveTextContent('[BLOCK:block]');
            expect(screen.getByText('Text with')).toBeInTheDocument();
            expect(screen.getByText('more text')).toBeInTheDocument();
        });

        it('should handle complex mixed content', () => {
            const content = 'The quadratic formula \\(x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\\) can be derived from: \\[ax^2 + bx + c = 0\\]';
            render(<Latex>{content}</Latex>);

            expect(screen.getByTestId('inline-math')).toBeInTheDocument();
            expect(screen.getByTestId('block-math')).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it('should handle unclosed delimiters as plain text', () => {
            render(<Latex>{'Unclosed \\(math here'}</Latex>);

            // Should render as plain text since delimiter is not closed
            expect(screen.queryByTestId('inline-math')).toBeNull();
            expect(screen.getByText(/Unclosed/)).toBeInTheDocument();
        });

        it('should handle escaped backslashes', () => {
            render(<Latex>{'Normal text with \\\\ backslash'}</Latex>);

            // Should not interpret as math
            expect(screen.queryByTestId('inline-math')).toBeNull();
        });

        it('should handle empty math expressions', () => {
            render(<Latex>{'Empty: \\(\\) inline'}</Latex>);

            expect(screen.getByTestId('inline-math')).toHaveTextContent('[INLINE:]');
        });

        it('should handle adjacent math expressions', () => {
            render(<Latex>{'\\(a\\)\\(b\\)'}</Latex>);

            const inlineElements = screen.getAllByTestId('inline-math');
            expect(inlineElements).toHaveLength(2);
        });
    });

    describe('inline code', () => {
        it('should render inline code with backticks', () => {
            render(<Latex>{'Use the `console.log()` function'}</Latex>);

            const codeEl = screen.getByTestId('inline-code');
            expect(codeEl).toBeInTheDocument();
            expect(codeEl.tagName).toBe('CODE');
            expect(codeEl).toHaveTextContent('console.log()');
        });

        it('should render multiple inline code segments', () => {
            render(<Latex>{'Use `let` or `const` to declare variables'}</Latex>);

            const codes = screen.getAllByTestId('inline-code');
            expect(codes).toHaveLength(2);
            expect(codes[0]).toHaveTextContent('let');
            expect(codes[1]).toHaveTextContent('const');
        });

        it('should preserve text around inline code', () => {
            render(<Latex>{'Before `code` after'}</Latex>);

            expect(screen.getByText(/Before/)).toBeInTheDocument();
            expect(screen.getByText(/after/)).toBeInTheDocument();
            expect(screen.getByTestId('inline-code')).toHaveTextContent('code');
        });

        it('should not match empty backticks', () => {
            render(<Latex>{'Empty `` here'}</Latex>);

            expect(screen.queryByTestId('inline-code')).toBeNull();
            expect(screen.getByText(/Empty/)).toBeInTheDocument();
        });

        it('should apply the inline-code class', () => {
            render(<Latex>{'The `x` variable'}</Latex>);

            expect(screen.getByTestId('inline-code')).toHaveClass('inline-code');
        });
    });

    describe('code blocks', () => {
        it('should render a fenced code block', () => {
            render(<Latex>{'```\nconsole.log("hello");\n```'}</Latex>);

            const block = screen.getByTestId('code-block');
            expect(block).toBeInTheDocument();
            expect(block.tagName).toBe('PRE');
            expect(block.querySelector('code')).toHaveTextContent('console.log("hello");');
        });

        it('should render a code block with language tag', () => {
            render(<Latex>{'```python\nprint("hello")\n```'}</Latex>);

            const block = screen.getByTestId('code-block');
            expect(block).toBeInTheDocument();
            expect(block).toHaveAttribute('data-language', 'python');
            // Language label should be present
            expect(screen.getByText('python')).toBeInTheDocument();
            expect(block.querySelector('code')).toHaveTextContent('print("hello")');
        });

        it('should render multi-line code blocks', () => {
            const code = '```js\nconst a = 1;\nconst b = 2;\nconsole.log(a + b);\n```';
            render(<Latex>{code}</Latex>);

            const block = screen.getByTestId('code-block');
            expect(block.querySelector('code')!.textContent).toContain('const a = 1;');
            expect(block.querySelector('code')!.textContent).toContain('console.log(a + b);');
        });

        it('should preserve text before and after code blocks', () => {
            render(<Latex>{'Look at this:\n```\ncode\n```\nPretty cool!'}</Latex>);

            expect(screen.getByText(/Look at this/)).toBeInTheDocument();
            expect(screen.getByText(/Pretty cool/)).toBeInTheDocument();
            expect(screen.getByTestId('code-block')).toBeInTheDocument();
        });

        it('should render multiple code blocks', () => {
            const content = '```js\na();\n```\nThen:\n```py\nb()\n```';
            render(<Latex>{content}</Latex>);

            const blocks = screen.getAllByTestId('code-block');
            expect(blocks).toHaveLength(2);
        });

        it('should apply the code-block class', () => {
            render(<Latex>{'```\ntest\n```'}</Latex>);

            expect(screen.getByTestId('code-block')).toHaveClass('code-block');
        });

        it('should not show language badge when no language specified', () => {
            render(<Latex>{'```\ntest\n```'}</Latex>);

            const block = screen.getByTestId('code-block');
            expect(block.querySelector('.code-block-lang')).toBeNull();
        });
    });

    describe('mixed code and math', () => {
        it('should handle inline code and inline math together', () => {
            render(<Latex>{'Use `x` where \\(x = 5\\)'}</Latex>);

            expect(screen.getByTestId('inline-code')).toHaveTextContent('x');
            expect(screen.getByTestId('inline-math')).toHaveTextContent('[INLINE:x = 5]');
        });

        it('should handle code blocks and block math together', () => {
            const content = '```js\nvar x = 1;\n```\nGiven: \\[x + y = 10\\]';
            render(<Latex>{content}</Latex>);

            expect(screen.getByTestId('code-block')).toBeInTheDocument();
            expect(screen.getByTestId('block-math')).toBeInTheDocument();
        });

        it('should handle all formats mixed together', () => {
            const content = 'Use `map()` to transform \\(n\\) items:\n```js\narr.map(x => x * 2);\n```\nResult: \\[O(n)\\]';
            render(<Latex>{content}</Latex>);

            expect(screen.getByTestId('inline-code')).toHaveTextContent('map()');
            expect(screen.getByTestId('inline-math')).toHaveTextContent('[INLINE:n]');
            expect(screen.getByTestId('code-block')).toBeInTheDocument();
            expect(screen.getByTestId('block-math')).toBeInTheDocument();
        });

        it('should not parse backticks inside code blocks as inline code', () => {
            render(<Latex>{'```\nuse `backticks` here\n```'}</Latex>);

            // The backticks should be inside the code block, not parsed as inline code
            const block = screen.getByTestId('code-block');
            expect(block.querySelector('code')!.textContent).toContain('`backticks`');
            // No inline code should be rendered
            expect(screen.queryByTestId('inline-code')).toBeNull();
        });
    });
});
