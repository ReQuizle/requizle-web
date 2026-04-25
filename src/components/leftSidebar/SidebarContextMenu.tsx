import React, {useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import {CheckCheck, Download, RotateCcw, Trash2} from 'lucide-react';
import type {Subject, Topic} from '../../types';

export type ContextMenuState =
    | null
    | {kind: 'subject'; subject: Subject; x: number; y: number; triggerEl?: HTMLElement | null}
    | {kind: 'topic'; subject: Subject; topic: Topic; x: number; y: number; triggerEl?: HTMLElement | null};

type SidebarContextMenuProps = {
    contextMenu: ContextMenuState;
    onQuickExportSubject: (subject: Subject) => void;
    onExportAsSubject: (subject: Subject) => void;
    onResetSubjectProgress: (subject: Subject) => void;
    onDeleteSubject: (subject: Subject) => void;
    onMarkTopicMastered: (subject: Subject, topic: Topic) => void;
    onResetTopicProgress: (subject: Subject, topic: Topic) => void;
};

export const SidebarContextMenu: React.FC<SidebarContextMenuProps> = ({
    contextMenu,
    onQuickExportSubject,
    onExportAsSubject,
    onResetSubjectProgress,
    onDeleteSubject,
    onMarkTopicMastered,
    onResetTopicProgress
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!contextMenu) return;
        const menu = menuRef.current;
        if (!menu) return;
        const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        if (items.length > 0) {
            items[0].focus();
        }
    }, [contextMenu]);

    if (!contextMenu) return null;

    const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const menu = menuRef.current;
        if (!menu) return;
        const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        if (items.length === 0) return;
        const activeIndex = items.findIndex(item => item === document.activeElement);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            items[(activeIndex + 1 + items.length) % items.length].focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            items[(activeIndex - 1 + items.length) % items.length].focus();
        } else if (e.key === 'Home') {
            e.preventDefault();
            items[0].focus();
        } else if (e.key === 'End') {
            e.preventDefault();
            items[items.length - 1].focus();
        }
    };

    return createPortal(
        <div
            ref={menuRef}
            data-context-menu
            role="menu"
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            className="fixed z-[100] min-w-[200px] py-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl"
            style={(() => {
                const pad = 8;
                const mw = 220;
                const mh = contextMenu.kind === 'subject' ? 230 : 180;
                const vw = typeof window !== 'undefined' ? window.innerWidth : contextMenu.x + mw;
                const vh = typeof window !== 'undefined' ? window.innerHeight : contextMenu.y + mh;
                return {
                    left: Math.max(pad, Math.min(contextMenu.x, vw - mw - pad)),
                    top: Math.max(pad, Math.min(contextMenu.y, vh - mh - pad))
                };
            })()}
        >
            {contextMenu.kind === 'subject' && (
                <>
                    <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={() => onQuickExportSubject(contextMenu.subject)}
                    >
                        <Download size={16} className="text-slate-500 shrink-0" />
                        Export
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={() => onExportAsSubject(contextMenu.subject)}
                    >
                        <Download size={16} className="text-slate-500 shrink-0" />
                        Export as...
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={() => onResetSubjectProgress(contextMenu.subject)}
                    >
                        <RotateCcw size={16} className="text-slate-500 shrink-0" />
                        Reset subject progress
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => onDeleteSubject(contextMenu.subject)}
                    >
                        <Trash2 size={16} className="shrink-0" />
                        Delete subject
                    </button>
                </>
            )}
            {contextMenu.kind === 'topic' && (
                <>
                    <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={() => onMarkTopicMastered(contextMenu.subject, contextMenu.topic)}
                    >
                        <CheckCheck size={16} className="text-slate-500 shrink-0" />
                        Mark topic mastered
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        onClick={() => onResetTopicProgress(contextMenu.subject, contextMenu.topic)}
                    >
                        <RotateCcw size={16} className="text-slate-500 shrink-0" />
                        Reset topic progress
                    </button>
                </>
            )}
        </div>,
        document.body
    );
};
