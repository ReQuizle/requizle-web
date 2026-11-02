import React from 'react';
import {PrismAsyncLight as SyntaxHighlighter} from 'react-syntax-highlighter';
import {vscDarkPlus} from 'react-syntax-highlighter/dist/esm/styles/prism';
import {MathFormula} from './MathFormula';

const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

const LANGUAGE_ALIASES: Record<string, string> = {
    'c++': 'cpp',
    'c#': 'csharp',
    cs: 'csharp',
    html: 'markup',
    js: 'javascript',
    md: 'markdown',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
    ts: 'typescript',
    xml: 'markup',
    yml: 'yaml'
};

function normalizeCodeLanguage(language: string): string {
    const key = language.trim().toLowerCase() || 'text';
    return LANGUAGE_ALIASES[key] ?? key;
}

// Replaces the theme's own spacing and background; the frame around the code comes from `.code-block`
const codeBlockCustomStyle: React.CSSProperties = {
    margin: 0,
    padding: '2rem 1rem 1rem',
    background: 'transparent'
};

interface RichTextProps {
    children: string;
    className?: string;
    inline?: boolean;
}

/**
 * Renders question and explanation text with a small Markdown-like syntax: fenced code blocks,
 * tables, blockquotes, LaTeX math, inline code, links, spoilers, bold, underline, strikethrough,
 * and italics. `inline` renders a single line without block elements or links.
 */
export const RichText: React.FC<RichTextProps> = ({children, className, inline = false}) => {
    if (!children) return null;

    if (inline) {
        return <span className={className}>{renderInlineWithoutLinks(children, 'rt')}</span>;
    }
    return <div className={className}>{renderContent(children, 'rt')}</div>;
};

/** Renders a piece of text into React nodes. `key` prefixes the keys of the returned nodes. */
type Renderer = (text: string, key: string) => React.ReactNode[];

/**
 * Builds a renderer that splits text on `pattern`. Each match is rendered by `renderMatch`, and the
 * text between matches is passed on to `renderText`. Keys extend the parent key with the part's
 * position, so they stay unique however deeply formats are nested.
 */
const splitOn =
    (
        pattern: RegExp,
        renderMatch: (match: RegExpExecArray, key: string) => React.ReactNode,
        renderText: Renderer
    ): Renderer =>
    (text, key) => {
        const parts: React.ReactNode[] = [];
        const regex = new RegExp(pattern, 'g');
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(...renderText(text.slice(lastIndex, match.index), `${key}.${parts.length}`));
            }
            parts.push(renderMatch(match, `${key}.${parts.length}`));
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            parts.push(...renderText(text.slice(lastIndex), `${key}.${parts.length}`));
        }

        return parts;
    };

// Each renderer handles one format and passes everything else to the next, from the outermost
// format (fenced code blocks) down to plain text.

const renderPlainText: Renderer = (text, key) => [<span key={key}>{text}</span>];

const renderItalic = splitOn(/\*([^*]+)\*/, (match, key) => <em key={key}>{match[1]}</em>, renderPlainText);

const renderStrikethrough = splitOn(
    /~~([^~]+)~~/,
    (match, key) => <del key={key}>{renderItalic(match[1], key)}</del>,
    renderItalic
);

const renderUnderline = splitOn(
    /__([^_]+)__/,
    (match, key) => (
        <u key={key} className="underline-offset-2">
            {renderStrikethrough(match[1], key)}
        </u>
    ),
    renderStrikethrough
);

const renderBold = splitOn(
    /\*\*([\s\S]+?)\*\*(?!\*)/,
    (match, key) => (
        <strong key={key} className="font-bold">
            {renderUnderline(match[1], key)}
        </strong>
    ),
    renderUnderline
);

const renderSpoilers = splitOn(
    /\|\|(.*?)\|\|/,
    (match, key) => (
        <span
            key={key}
            className="bg-slate-300 text-transparent hover:text-slate-900 dark:bg-slate-700 dark:hover:text-slate-100 transition-colors cursor-help rounded px-1.5 py-0.5"
            title="Reveal spoiler"
        >
            {renderBold(match[1], key)}
        </span>
    ),
    renderBold
);

/** Returns the link target if it uses an allowed protocol, otherwise null. */
function getSafeLinkHref(rawHref: string): string | null {
    const href = rawHref.trim();
    if (!href) return null;

    try {
        const {protocol} = new URL(href, window.location.origin);
        return SAFE_LINK_PROTOCOLS.has(protocol) ? href : null;
    } catch {
        return null;
    }
}

const renderLinks = splitOn(
    /\[([^\]]+)\]\(([^)]+)\)/,
    (match, key) => {
        const safeHref = getSafeLinkHref(match[2]);
        if (!safeHref) {
            return <span key={key}>{match[0]}</span>;
        }
        return (
            <a
                key={key}
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
                {renderSpoilers(match[1], key)}
            </a>
        );
    },
    renderSpoilers
);

const renderInlineMath = (renderText: Renderer) =>
    splitOn(/\\\(([\s\S]*?)\\\)/, (match, key) => <MathFormula key={key} math={match[1]} />, renderText);

const renderInlineCode = (renderText: Renderer) =>
    splitOn(
        /`([^`]+)`/,
        (match, key) => (
            <code key={key} className="inline-code" data-testid="inline-code">
                {match[1]}
            </code>
        ),
        renderInlineMath(renderText)
    );

const renderInlineWithLinks = renderInlineCode(renderLinks);
const renderInlineWithoutLinks = renderInlineCode(renderSpoilers);

const renderBlockMath = splitOn(
    /\\\[([\s\S]*?)\\\]/,
    (match, key) => (
        <div key={key} className="my-4">
            <MathFormula math={match[1].trim()} block />
        </div>
    ),
    renderInlineWithLinks
);

const renderBlockquotes = splitOn(
    /(?:^|\n)((?:>[^\n]*(?:\n|$))+)/,
    (match, key) => (
        <blockquote
            key={key}
            className="border-l-4 border-indigo-500 pl-4 py-1 my-4 bg-slate-100 dark:bg-slate-800/50 italic text-slate-700 dark:text-slate-300 rounded-r-lg"
        >
            {renderBlockMath(match[1].replace(/(^|\n)>[ \t]?/g, '$1').trim(), key)}
        </blockquote>
    ),
    renderBlockMath
);

/** Splits a Markdown table row into trimmed cells, ignoring the outer pipes. */
function extractTableCells(row: string): string[] {
    const cells = row.trim().split('|');
    if (cells.length > 0 && cells[0].trim() === '') cells.shift();
    if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();
    return cells.map((cell) => cell.trim());
}

const renderTables = splitOn(
    /(?:^|\n)((?:[ \t]*\|[^\n]+\|[ \t]*(?:\n|$)){2,})/,
    (match, key) => {
        const lines = match[1].trim().split('\n');
        const hasSeparatorRow = lines.length > 1 && /^\|?[\s-:]+\|/.test(lines[1]);
        if (!hasSeparatorRow) {
            return <React.Fragment key={key}>{renderBlockquotes(match[0], key)}</React.Fragment>;
        }

        const headers = extractTableCells(lines[0]);
        const rows = lines.slice(2).map(extractTableCells);

        return (
            <div
                key={key}
                className="overflow-x-auto my-4 rounded-lg border border-slate-200 dark:border-slate-700 w-full shadow-sm"
            >
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <tr>
                            {headers.map((header, i) => (
                                <th
                                    key={i}
                                    className="px-4 py-3 font-semibold border-b border-slate-200 dark:border-slate-700"
                                >
                                    {renderBlockquotes(header, `${key}.th${i}`)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                        {rows.map((cells, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                {cells.map((cell, j) => (
                                    <td key={j} className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                        {renderBlockquotes(cell, `${key}.td${i}.${j}`)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    },
    renderBlockquotes
);

const renderContent = splitOn(
    /```([^\s`]*)[^\S\r\n]*\r?\n([\s\S]*?)```/,
    (match, key) => {
        const language = match[1];

        return (
            <div key={key} className="code-block">
                {language && <span className="code-block-lang">{language}</span>}
                <SyntaxHighlighter
                    language={normalizeCodeLanguage(language)}
                    style={vscDarkPlus}
                    customStyle={codeBlockCustomStyle}
                    data-testid="code-block"
                >
                    {match[2]}
                </SyntaxHighlighter>
            </div>
        );
    },
    renderTables
);
