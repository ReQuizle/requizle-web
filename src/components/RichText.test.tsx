/**
 * Tests for RichText component
 * Tests math delimiters parsing, code blocks, and inline code rendering
 */
import {describe, it, expect, vi} from 'vitest';
import {render, screen} from '@testing-library/react';
import {RichText} from './RichText';

// Mock react-katex to avoid actual KaTeX rendering in tests
vi.mock('react-katex', () => ({
    InlineMath: ({math}: {math: string}) => <span data-testid="inline-math">{`[INLINE:${math}]`}</span>,
    BlockMath: ({math}: {math: string}) => <div data-testid="block-math">{`[BLOCK:${math}]`}</div>
}));

vi.mock('react-syntax-highlighter', () => ({
    PrismAsyncLight: ({
        children,
        className,
        'data-testid': testId
    }: {
        children: string;
        className?: string;
        'data-testid'?: string;
    }) => (
        <pre className={className} data-testid={testId}>
            <code>{children}</code>
        </pre>
    )
}));

describe('RichText', () => {

    describe('plain text', () => {
        it('should render plain text without math', () => {
            render(<RichText>Hello world</RichText>);

            expect(screen.getByText('Hello world')).toBeInTheDocument();
        });

        it('should render empty content safely', () => {
            const {container} = render(<RichText>{''}</RichText>);

            expect(container.firstChild).toBeNull();
        });

        it('should preserve dollar signs in plain text', () => {
            render(<RichText>The price is $50 and $100</RichText>);

            expect(screen.getByText('The price is $50 and $100')).toBeInTheDocument();
        });

        it('should apply className to wrapper', () => {
            const {container} = render(<RichText className="custom-class">Hello</RichText>);

            expect(container.firstChild).toHaveClass('custom-class');
        });
    });

    describe('inline math \\\\(...\\\\)', () => {
        it('should render inline math', () => {
            render(<RichText>{'The formula is \\(x^2\\)'}</RichText>);

            expect(screen.getByTestId('inline-math')).toHaveTextContent('[INLINE:x^2]');
        });

        it('should render multiple inline math expressions', () => {
            render(<RichText>{'\\(a\\) and \\(b\\) are variables'}</RichText>);

            const inlineElements = screen.getAllByTestId('inline-math');
            expect(inlineElements).toHaveLength(2);
            expect(inlineElements[0]).toHaveTextContent('[INLINE:a]');
            expect(inlineElements[1]).toHaveTextContent('[INLINE:b]');
        });

        it('should handle complex inline math', () => {
            render(<RichText>{'Calculate \\(\\frac{a}{b} + \\sqrt{c}\\)'}</RichText>);

            expect(screen.getByTestId('inline-math')).toHaveTextContent('[INLINE:\\frac{a}{b} + \\sqrt{c}]');
        });

        it('should preserve text around inline math', () => {
            render(<RichText>{'Before \\(x\\) after'}</RichText>);

            expect(screen.getByText('Before')).toBeInTheDocument();
            expect(screen.getByText('after')).toBeInTheDocument();
            expect(screen.getByTestId('inline-math')).toBeInTheDocument();
        });
    });

    describe('block math \\\\[...\\\\]', () => {
        it('should render block math', () => {
            render(<RichText>{'Check this: \\[E = mc^2\\]'}</RichText>);

            expect(screen.getByTestId('block-math')).toHaveTextContent('[BLOCK:E = mc^2]');
        });

        it('should render multiple block math expressions', () => {
            render(<RichText>{'\\[a^2\\] and \\[b^2\\]'}</RichText>);

            const blockElements = screen.getAllByTestId('block-math');
            expect(blockElements).toHaveLength(2);
        });

        it('should handle multiline block math', () => {
            render(<RichText>{'\\[a + b\\]'}</RichText>);

            expect(screen.getByTestId('block-math')).toHaveTextContent('[BLOCK:a + b]');
        });
    });

    describe('mixed content', () => {
        it('should handle inline and block math together', () => {
            render(<RichText>{'Text with \\(inline\\) and block: \\[block\\] more text'}</RichText>);

            expect(screen.getByTestId('inline-math')).toHaveTextContent('[INLINE:inline]');
            expect(screen.getByTestId('block-math')).toHaveTextContent('[BLOCK:block]');
            expect(screen.getByText('Text with')).toBeInTheDocument();
            expect(screen.getByText('more text')).toBeInTheDocument();
        });

        it('should handle complex mixed content', () => {
            const content = 'The quadratic formula \\(x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\\) can be derived from: \\[ax^2 + bx + c = 0\\]';
            render(<RichText>{content}</RichText>);

            expect(screen.getByTestId('inline-math')).toBeInTheDocument();
            expect(screen.getByTestId('block-math')).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it('should handle unclosed delimiters as plain text', () => {
            render(<RichText>{'Unclosed \\(math here'}</RichText>);

            // Should render as plain text since delimiter is not closed
            expect(screen.queryByTestId('inline-math')).toBeNull();
            expect(screen.getByText(/Unclosed/)).toBeInTheDocument();
        });

        it('should handle escaped backslashes', () => {
            render(<RichText>{'Normal text with \\\\ backslash'}</RichText>);

            // Should not interpret as math
            expect(screen.queryByTestId('inline-math')).toBeNull();
        });

        it('should handle empty math expressions', () => {
            render(<RichText>{'Empty: \\(\\) inline'}</RichText>);

            expect(screen.getByTestId('inline-math')).toHaveTextContent('[INLINE:]');
        });

        it('should handle adjacent math expressions', () => {
            render(<RichText>{'\\(a\\)\\(b\\)'}</RichText>);

            const inlineElements = screen.getAllByTestId('inline-math');
            expect(inlineElements).toHaveLength(2);
        });
    });

    describe('inline code', () => {
        it('should render inline code with backticks', () => {
            render(<RichText>{'Use the `console.log()` function'}</RichText>);

            const codeEl = screen.getByTestId('inline-code');
            expect(codeEl).toBeInTheDocument();
            expect(codeEl.tagName).toBe('CODE');
            expect(codeEl).toHaveTextContent('console.log()');
        });

        it('should render multiple inline code segments', () => {
            render(<RichText>{'Use `let` or `const` to declare variables'}</RichText>);

            const codes = screen.getAllByTestId('inline-code');
            expect(codes).toHaveLength(2);
            expect(codes[0]).toHaveTextContent('let');
            expect(codes[1]).toHaveTextContent('const');
        });

        it('should preserve text around inline code', () => {
            render(<RichText>{'Before `code` after'}</RichText>);

            expect(screen.getByText(/Before/)).toBeInTheDocument();
            expect(screen.getByText(/after/)).toBeInTheDocument();
            expect(screen.getByTestId('inline-code')).toHaveTextContent('code');
        });

        it('should not match empty backticks', () => {
            render(<RichText>{'Empty `` here'}</RichText>);

            expect(screen.queryByTestId('inline-code')).toBeNull();
            expect(screen.getByText(/Empty/)).toBeInTheDocument();
        });

        it('should apply the inline-code class', () => {
            render(<RichText>{'The `x` variable'}</RichText>);

            expect(screen.getByTestId('inline-code')).toHaveClass('inline-code');
        });
    });

    describe('code blocks', () => {
        it('should render a fenced code block', () => {
            render(<RichText>{'```\nconsole.log("hello");\n```'}</RichText>);

            const block = screen.getByTestId('code-block');
            expect(block).toBeInTheDocument();
            expect(block.tagName).toBe('PRE');
            expect(block.querySelector('code')).toHaveTextContent('console.log("hello");');
        });

        it('should render a code block with language tag', () => {
            render(<RichText>{'```python\nprint("hello")\n```'}</RichText>);

            const block = screen.getByTestId('code-block');
            expect(block).toBeInTheDocument();
            // Language label should be present
            expect(screen.getByText('python')).toBeInTheDocument();
            expect(block.querySelector('code')).toHaveTextContent('print("hello")');
        });

        it('should render code blocks with Windows CRLF line endings', () => {
            render(<RichText>{'```ts\r\nconst x = 1;\r\n```'}</RichText>);

            const block = screen.getByTestId('code-block');
            expect(block).toBeInTheDocument();
            expect(screen.getByText('ts')).toBeInTheDocument();
            expect(block.querySelector('code')).toHaveTextContent('const x = 1;');
        });

        it('should render language tags with non-word characters', () => {
            render(<RichText>{'```c++\nint main() {}\n```'}</RichText>);

            expect(screen.getByText('c++')).toBeInTheDocument();
            expect(screen.getByTestId('code-block').querySelector('code')).toHaveTextContent('int main() {}');
        });

        it('should render multi-line code blocks', () => {
            const code = '```js\nconst a = 1;\nconst b = 2;\nconsole.log(a + b);\n```';
            render(<RichText>{code}</RichText>);

            const block = screen.getByTestId('code-block');
            expect(block.querySelector('code')!.textContent).toContain('const a = 1;');
            expect(block.querySelector('code')!.textContent).toContain('console.log(a + b);');
        });

        it('should preserve text before and after code blocks', () => {
            render(<RichText>{'Look at this:\n```\ncode\n```\nPretty cool!'}</RichText>);

            expect(screen.getByText(/Look at this/)).toBeInTheDocument();
            expect(screen.getByText(/Pretty cool/)).toBeInTheDocument();
            expect(screen.getByTestId('code-block')).toBeInTheDocument();
        });

        it('should render multiple code blocks', () => {
            const content = '```js\na();\n```\nThen:\n```py\nb()\n```';
            render(<RichText>{content}</RichText>);

            const blocks = screen.getAllByTestId('code-block');
            expect(blocks).toHaveLength(2);
        });

        it('should apply the code-block class', () => {
            render(<RichText>{'```\ntest\n```'}</RichText>);

            expect(screen.getByTestId('code-block')).toHaveClass('code-block');
        });

        it('should not show language badge when no language specified', () => {
            render(<RichText>{'```\ntest\n```'}</RichText>);

            const block = screen.getByTestId('code-block');
            expect(block.querySelector('.code-block-lang')).toBeNull();
        });
    });

    describe('mixed code and math', () => {
        it('should handle inline code and inline math together', () => {
            render(<RichText>{'Use `x` where \\(x = 5\\)'}</RichText>);

            expect(screen.getByTestId('inline-code')).toHaveTextContent('x');
            expect(screen.getByTestId('inline-math')).toHaveTextContent('[INLINE:x = 5]');
        });

        it('should handle code blocks and block math together', () => {
            const content = '```js\nvar x = 1;\n```\nGiven: \\[x + y = 10\\]';
            render(<RichText>{content}</RichText>);

            expect(screen.getByTestId('code-block')).toBeInTheDocument();
            expect(screen.getByTestId('block-math')).toBeInTheDocument();
        });

        it('should handle all formats mixed together', () => {
            const content = 'Use `map()` to transform \\(n\\) items:\n```js\narr.map(x => x * 2);\n```\nResult: \\[O(n)\\]';
            render(<RichText>{content}</RichText>);

            expect(screen.getByTestId('inline-code')).toHaveTextContent('map()');
            expect(screen.getByTestId('inline-math')).toHaveTextContent('[INLINE:n]');
            expect(screen.getByTestId('code-block')).toBeInTheDocument();
            expect(screen.getByTestId('block-math')).toBeInTheDocument();
        });

        it('should not parse backticks inside code blocks as inline code', () => {
            render(<RichText>{'```\nuse `backticks` here\n```'}</RichText>);

            // The backticks should be inside the code block, not parsed as inline code
            const block = screen.getByTestId('code-block');
            expect(block.querySelector('code')!.textContent).toContain('`backticks`');
            // No inline code should be rendered
            expect(screen.queryByTestId('inline-code')).toBeNull();
        });
    });

    describe('markdown features', () => {
        it('should render blockquotes', () => {
            render(<RichText>{'> quote block'}</RichText>);
            expect(screen.getByText('quote block')).toBeInTheDocument();
        });
        it('should render tables', () => {
            render(<RichText>{'| A | B |\n|---|---|\n| C | D |'}</RichText>);
            expect(screen.getByText('A')).toBeInTheDocument();
            expect(screen.getByText('D')).toBeInTheDocument();
        });
        it('should render links', () => {
            render(<RichText>{'[link text](https://link.com)'}</RichText>);
            const link = screen.getByRole('link');
            expect(link).toHaveAttribute('href', 'https://link.com');
            expect(link).toHaveTextContent('link text');
        });
        it('should render unsafe javascript links as plain text', () => {
            render(<RichText>{'[bad link](javascript:alert)'}</RichText>);
            expect(screen.queryByRole('link')).toBeNull();
            expect(screen.getByText('[bad link](javascript:alert)')).toBeInTheDocument();
        });
        it('should allow mailto links', () => {
            render(<RichText>{'[email](mailto:test@example.com)'}</RichText>);
            expect(screen.getByRole('link')).toHaveAttribute('href', 'mailto:test@example.com');
        });
        it('should render bold, italic, underline, strikethrough', () => {
            render(<RichText>{'**bold** *italic* __underline__ ~~strike~~'}</RichText>);
            expect(screen.getByText('bold').closest('strong')).toHaveClass('font-bold');
            expect(screen.getByText('italic').closest('em')).toHaveClass('italic');
            expect(screen.getByText('underline').closest('u')).toHaveClass('underline');
            expect(screen.getByText('strike').closest('del')).toHaveClass('line-through');
        });
        it('should render italic inside bold text', () => {
            render(<RichText>{'**bold *italic***'}</RichText>);
            const italic = screen.getByText('italic');
            expect(italic.closest('em')).toHaveClass('italic');
            expect(italic.closest('strong')).toHaveClass('font-bold');
        });
        it('should render spoilers', () => {
            render(<RichText>{'||spoiler||'}</RichText>);
            const spoiler = screen.getByTitle('Reveal Spoiler');
            expect(spoiler).toBeInTheDocument();
            expect(spoiler).toHaveTextContent('spoiler');
        });
    });
});
