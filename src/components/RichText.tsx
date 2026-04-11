import React from 'react';
import 'katex/dist/katex.min.css';
import {InlineMath, BlockMath} from 'react-katex';

interface RichTextProps {
    children: string;
    className?: string;
}

/**
 * Renders text with rich formatting support:
 * - Inline math: \(...\)
 * - Block math: \[...\]
 * - Code blocks: ```language\ncode\n``` (with optional language tag)
 * - Inline code: `code`
 *
 * Parsing order: code blocks → block math → inline code → inline math → plain text
 */
export const RichText: React.FC<RichTextProps> = ({children, className}) => {
    if (!children) return null;

    const parts = parseContent(children);

    return <span className={className}>{parts}</span>;
};


/** Top-level parser: splits on fenced code blocks first, then delegates */
function parseContent(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let key = 0;

    // Match fenced code blocks: ```lang?\n...\n```
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
        // Process text before the code block (may contain block math, inline code, inline math)
        if (match.index > lastIndex) {
            const before = text.slice(lastIndex, match.index);
            parts.push(...parseBlockMath(before, key));
            key += 1000;
        }

        const language = match[1] || '';
        const code = match[2];

        parts.push(
            <pre
                key={`codeblock-${key++}`}
                className="code-block"
                data-testid="code-block"
                data-language={language || undefined}
            >
                {language && (
                    <span className="code-block-lang">{language}</span>
                )}
                <code>{code}</code>
            </pre>
        );

        lastIndex = match.index + match[0].length;
    }

    // Process remaining text after last code block
    if (lastIndex < text.length) {
        parts.push(...parseBlockMath(text.slice(lastIndex), key));
    }

    return parts;
}

/** Parse block math \[...\], delegating non-block-math text to parseInlineCode */
function parseBlockMath(text: string, startKey: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let key = startKey;

    const blockRegex = /\\\[([\s\S]*?)\\\]/g;
    let lastIndex = 0;
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const before = text.slice(lastIndex, match.index);
            parts.push(...parseInlineCode(before, key));
            key += 100;
        }

        parts.push(
            <div key={`block-${key++}`} className="my-4">
                <BlockMath math={match[1].trim()} errorColor="#cc0000" />
            </div>
        );

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(...parseInlineCode(text.slice(lastIndex), key));
    }

    return parts;
}

/** Parse inline code `...`, delegating remaining text to parseInlineMath */
function parseInlineCode(text: string, startKey: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let key = startKey;

    // Match single backtick inline code (non-greedy, no nested backticks)
    const inlineCodeRegex = /`([^`]+)`/g;
    let lastIndex = 0;
    let match;

    while ((match = inlineCodeRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const before = text.slice(lastIndex, match.index);
            parts.push(...parseInlineMath(before, key));
            key += 50;
        }

        parts.push(
            <code key={`inline-code-${key++}`} className="inline-code" data-testid="inline-code">
                {match[1]}
            </code>
        );

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(...parseInlineMath(text.slice(lastIndex), key));
    }

    return parts;
}

/** Parse inline math \(...\), leaving remaining text as plain spans */
function parseInlineMath(text: string, startKey: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const inlineRegex = /\\\(([\s\S]*?)\\\)/g;
    let lastIndex = 0;
    let match;
    let key = startKey;

    while ((match = inlineRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
        }

        parts.push(<InlineMath key={key++} math={match[1]} errorColor="#cc0000" />);

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }

    return parts;
}
