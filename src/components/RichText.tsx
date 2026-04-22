import React from 'react';
import 'katex/dist/katex.min.css';
import {InlineMath, BlockMath} from 'react-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
 * - Blockquotes: `> quote`
 * - Tables: `| col | col |`
 * - Links: `[text](url)`
 * - Spoilers: `||spoiler||`
 * - Bold: **text**
 * - Underline: __text__
 * - Strikethrough: ~~text~~
 * - Italic: *text*
 *
 * Parsing order: code blocks → tables → blockquotes → block math → inline code → inline math → links → spoilers → bold → underline → strikethrough → italic → plain text
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
            parts.push(...parseTables(before, key));
            key += 1000;
        }

        const language = match[1] || '';
        const code = match[2];

        parts.push(
            <div key={`codeblock-wrapper-${key++}`} className="relative my-4 w-full">
                {language && (
                    <span className="code-block-lang z-10 pointer-events-none">{language}</span>
                )}
                <SyntaxHighlighter
                    language={language || 'text'}
                    style={vscDarkPlus}
                    className="code-block !my-0"
                    customStyle={{ margin: 0, background: 'transparent', padding: '1rem', paddingTop: '2rem' }} 
                    data-testid="code-block"
                >
                    {code}
                </SyntaxHighlighter>
            </div>
        );

        lastIndex = match.index + match[0].length;
    }

    // Process remaining text after last code block
    if (lastIndex < text.length) {
        parts.push(...parseTables(text.slice(lastIndex), key));
    }

    return parts;
}

/** Parse markdown tables, delegating remaining to parseBlockquotes */
function parseTables(text: string, startKey: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const tableRegex = /(?:^|\n)((?:[ \t]*\|[^\n]+\|[ \t]*(?:\n|$)){2,})/g;
    let lastIndex = 0;
    let match;
    let key = startKey;

    while ((match = tableRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const before = text.slice(lastIndex, match.index);
            parts.push(...parseBlockquotes(before, key));
            key += 1000;
        }

        const tableText = match[1].trim();
        const lines = tableText.split('\n');
        
        // Ensure it has a separator line roughly matching |---|
        if (lines.length > 1 && /^\|?[\s-:]+\|/.test(lines[1])) {
            const headerRow = lines[0];
            const dataRows = lines.slice(2);
            
            const extractCells = (row: string) => {
                const cells = row.trim().split('|');
                if (cells.length > 0 && cells[0].trim() === '') cells.shift();
                if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();
                return cells.map(cell => cell.trim());
            };

            const headers = extractCells(headerRow);
            
            parts.push(
                <div key={`table-wrapper-${key++}`} className="overflow-x-auto my-4 rounded-lg border border-slate-200 dark:border-slate-700 w-full shadow-sm">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <tr>
                                {headers.map((h, i) => (
                                    <th key={`th-${key}-${i}`} className="px-4 py-3 font-semibold border-b border-slate-200 dark:border-slate-700">
                                        {parseBlockquotes(h, key + i * 10)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                            {dataRows.map((row, i) => {
                                const cells = extractCells(row);
                                return (
                                    <tr key={`tr-${key}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        {cells.map((c, j) => (
                                            <td key={`td-${key}-${i}-${j}`} className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                {parseBlockquotes(c, key + 1000 + i * 100 + j)}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            );
            key += 2000;
        } else {
            parts.push(...parseBlockquotes(match[0], key));
        }

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(...parseBlockquotes(text.slice(lastIndex), key));
    }

    return parts;
}

/** Parse blockquotes > ..., delegating remaining to parseBlockMath */
function parseBlockquotes(text: string, startKey: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const bqRegex = /(?:^|\n)((?:>[^\n]*(?:\n|$))+)/g;
    let lastIndex = 0;
    let match;
    let key = startKey;

    while ((match = bqRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(...parseBlockMath(text.slice(lastIndex, match.index), key));
            key += 1000;
        }

        // remove leading '> ' or '>' from each line
        const innerText = match[1].replace(/(^|\n)>[ \t]?/g, '$1').trim();
        
        parts.push(
            <blockquote key={`bq-${key++}`} className="border-l-4 border-indigo-500 pl-4 py-1 my-4 bg-slate-100 dark:bg-slate-800/50 italic text-slate-700 dark:text-slate-300 rounded-r-lg">
                {parseBlockMath(innerText, key)}
            </blockquote>
        );

        lastIndex = match.index + match[0].length;
    }

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

/** Parse inline math \(...\), delegating remaining text to parseLinks */
function parseInlineMath(text: string, startKey: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const inlineRegex = /\\\(([\s\S]*?)\\\)/g;
    let lastIndex = 0;
    let match;
    let key = startKey;

    while ((match = inlineRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(...parseLinks(text.slice(lastIndex, match.index), key));
            key += 20;
        }

        parts.push(<InlineMath key={key++} math={match[1]} errorColor="#cc0000" />);

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(...parseLinks(text.slice(lastIndex), key));
    }

    return parts;
}

/** Parse masked links [text](url), delegating remaining to parseSpoilers */
function parseLinks(text: string, startKey: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;
    let key = startKey;

    while ((match = linkRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(...parseSpoilers(text.slice(lastIndex, match.index), key));
            key += 100;
        }

        parts.push(
            <a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                {parseSpoilers(match[1], key)}
            </a>
        );

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(...parseSpoilers(text.slice(lastIndex), key));
    }

    return parts;
}

/** Parse spoilers ||...||, delegating remaining to parseBold */
function parseSpoilers(text: string, startKey: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const spoilerRegex = /\|\|(.*?)\|\|/g;
    let lastIndex = 0;
    let match;
    let key = startKey;

    while ((match = spoilerRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(...parseBold(text.slice(lastIndex, match.index), key));
            key += 100;
        }

        parts.push(
            <span key={key++} className="bg-slate-300 text-transparent hover:text-slate-900 dark:bg-slate-700 dark:text-transparent dark:hover:text-slate-100 transition-colors cursor-help rounded px-1.5 py-0.5" title="Reveal Spoiler">
                {parseBold(match[1], key)}
            </span>
        );

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(...parseBold(text.slice(lastIndex), key));
    }

    return parts;
}

/** Parse bold text **...**, delegating remaining text to parseUnderline */
function parseBold(text: string, startKey: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;
    let key = startKey;

    while ((match = boldRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(...parseUnderline(text.slice(lastIndex, match.index), key));
            key += 10;
        }

        parts.push(<strong key={key++} className="font-bold">{parseUnderline(match[1], key)}</strong>);

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(...parseUnderline(text.slice(lastIndex), key));
    }

    return parts;
}

/** Parse underline text __...__, delegating remaining text to parseStrikethrough */
function parseUnderline(text: string, startKey: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const underlineRegex = /__([^_]+)__/g;
    let lastIndex = 0;
    let match;
    let key = startKey;

    while ((match = underlineRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(...parseStrikethrough(text.slice(lastIndex, match.index), key));
            key += 5;
        }

        parts.push(<u key={key++} className="underline underline-offset-2">{parseStrikethrough(match[1], key)}</u>);

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(...parseStrikethrough(text.slice(lastIndex), key));
    }

    return parts;
}

/** Parse strikethrough text ~~...~~, delegating remaining text to parseItalic */
function parseStrikethrough(text: string, startKey: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    const strikeRegex = /~~([^~]+)~~/g;
    let lastIndex = 0;
    let match;
    let key = startKey;

    while ((match = strikeRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(...parseItalic(text.slice(lastIndex, match.index), key));
            key += 5;
        }

        parts.push(<del key={key++} className="line-through">{parseItalic(match[1], key)}</del>);

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(...parseItalic(text.slice(lastIndex), key));
    }

    return parts;
}

/** Parse italic text *...*, leaving remaining text as plain spans */
function parseItalic(text: string, startKey: number): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    // Match a single asterisk that is not adjacent to another asterisk
    const italicRegex = /\*([^*]+)\*/g;
    let lastIndex = 0;
    let match;
    let key = startKey;

    while ((match = italicRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
        }

        parts.push(<em key={key++} className="italic">{match[1]}</em>);

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }

    return parts;
}
