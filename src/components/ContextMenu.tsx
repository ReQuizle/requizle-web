import React, {useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import {clsx} from 'clsx';

type ContextMenuIcon = React.ComponentType<{size?: number; className?: string}>;

export type ContextMenuItem = {
    id: string;
    label: string;
    icon?: ContextMenuIcon;
    danger?: boolean;
    onSelect: () => void;
};

type ContextMenuProps = {
    open: boolean;
    position: {x: number; y: number} | null;
    triggerEl?: HTMLElement | null;
    items: ContextMenuItem[];
    onClose: () => void;
    minWidth?: number;
    estimatedHeight?: number;
};

export const ContextMenu: React.FC<ContextMenuProps> = ({
    open,
    position,
    triggerEl,
    items,
    onClose,
    minWidth = 220,
    estimatedHeight = 220
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerElRef = useRef<HTMLElement | null | undefined>(triggerEl);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        triggerElRef.current = triggerEl;
    }, [triggerEl]);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!open) return;
        const handlePointerDown = (e: PointerEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest('[data-context-menu]')) return;
            onCloseRef.current();
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCloseRef.current();
            }
        };
        document.addEventListener('pointerdown', handlePointerDown, true);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true);
            document.removeEventListener('keydown', handleKeyDown);
            triggerElRef.current?.focus?.();
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
        first?.focus();
    }, [open]);

    const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const menu = menuRef.current;
        if (!menu) return;
        const menuitems = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        if (menuitems.length === 0) return;
        const active = menuitems.findIndex(el => el === document.activeElement);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            menuitems[(active + 1 + menuitems.length) % menuitems.length].focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            menuitems[(active - 1 + menuitems.length) % menuitems.length].focus();
        } else if (e.key === 'Home') {
            e.preventDefault();
            menuitems[0].focus();
        } else if (e.key === 'End') {
            e.preventDefault();
            menuitems[menuitems.length - 1].focus();
        }
    };

    if (!open || !position) return null;

    const pad = 8;
    const vw = typeof window !== 'undefined' ? window.innerWidth : position.x + minWidth;
    const vh = typeof window !== 'undefined' ? window.innerHeight : position.y + estimatedHeight;
    const style: React.CSSProperties = {
        left: Math.max(pad, Math.min(position.x, vw - minWidth - pad)),
        top: Math.max(pad, Math.min(position.y, vh - estimatedHeight - pad))
    };

    return createPortal(
        <div
            ref={menuRef}
            data-context-menu
            role="menu"
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            className="fixed z-[100] min-w-[200px] py-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl"
            style={style}
        >
            {items.map(item => {
                const Icon = item.icon;
                return (
                    <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        className={clsx(
                            'w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm',
                            item.danger
                                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                        )}
                        onClick={item.onSelect}
                    >
                        {Icon && (
                            <Icon
                                size={16}
                                className={clsx('shrink-0', !item.danger && 'text-slate-500')}
                            />
                        )}
                        {item.label}
                    </button>
                );
            })}
        </div>,
        document.body
    );
};
