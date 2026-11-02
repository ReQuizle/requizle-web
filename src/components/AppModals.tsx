import React, {useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useModalA11y} from './modalA11y';

type ModalShellProps = {
    title: string;
    /** Shown before the title */
    icon?: React.ReactNode;
    onClose: () => void;
    width?: 'max-w-sm' | 'max-w-md' | 'max-w-lg';
    closeOnOverlayMouseDown?: boolean;
    children: React.ReactNode;
};

/** A titled dialog over the page that traps focus and closes on Escape or a click outside it. */
export function ModalShell({
    title,
    icon,
    onClose,
    width = 'max-w-sm',
    closeOnOverlayMouseDown = true,
    children
}: ModalShellProps) {
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    useModalA11y(dialogRef, onClose);

    const heading = (
        <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
        </h2>
    );

    return createPortal(
        <div
            className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onMouseDown={(e) => {
                if (closeOnOverlayMouseDown && e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className={`bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full p-6 space-y-4 ${width}`}
            >
                {icon ? (
                    <div className="flex items-center gap-3">
                        {icon}
                        {heading}
                    </div>
                ) : (
                    heading
                )}
                {children}
            </div>
        </div>,
        document.body
    );
}

type TypeToConfirmModalProps = {
    open: boolean;
    title: string;
    description: React.ReactNode;
    /** Exact string the user must type to enable confirm (e.g. subject name for delete). */
    phraseToMatch: string;
    inputPlaceholder?: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onClose: () => void;
};

/** Renders `null` when `open` is false so the form state resets on next open. */
export function TypeToConfirmModal({open, ...rest}: TypeToConfirmModalProps) {
    if (!open) return null;
    return <TypeToConfirmModalMounted {...rest} />;
}

function TypeToConfirmModalMounted({
    title,
    description,
    phraseToMatch,
    inputPlaceholder = 'Type to confirm...',
    confirmLabel = 'Delete',
    onConfirm,
    onClose
}: Omit<TypeToConfirmModalProps, 'open'>) {
    const [input, setInput] = useState('');
    const inputId = useId();

    return (
        <ModalShell title={title} onClose={onClose}>
            <div className="text-sm text-slate-600 dark:text-slate-400">{description}</div>
            <div className="space-y-2">
                <label htmlFor={inputId} className="text-sm text-slate-600 dark:text-slate-400">
                    Type <strong className="text-red-700 dark:text-red-400">{phraseToMatch}</strong> to confirm:
                </label>
                <input
                    id={inputId}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                    placeholder={inputPlaceholder}
                    autoFocus
                />
            </div>
            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={input !== phraseToMatch}
                    className="btn-danger flex-1 text-sm"
                >
                    {confirmLabel}
                </button>
            </div>
        </ModalShell>
    );
}

// Written out in full so Tailwind finds the class names
const CONFIRM_BUTTON_CLASS = {
    danger: 'btn-danger flex-1 text-sm',
    warning: 'btn-warning flex-1 text-sm',
    primary: 'btn-primary flex-1 text-sm'
};

type SimpleConfirmModalProps = {
    open: boolean;
    title: string;
    children: React.ReactNode;
    confirmLabel: string;
    confirmTone?: keyof typeof CONFIRM_BUTTON_CLASS;
    onConfirm: () => void;
    onClose: () => void;
};

export function SimpleConfirmModal({
    open,
    title,
    children,
    confirmLabel,
    confirmTone = 'danger',
    onConfirm,
    onClose
}: SimpleConfirmModalProps) {
    if (!open) return null;
    return (
        <ModalShell title={title} onClose={onClose}>
            <div className="text-sm text-slate-600 dark:text-slate-400">{children}</div>
            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">
                    Cancel
                </button>
                <button type="button" onClick={onConfirm} className={CONFIRM_BUTTON_CLASS[confirmTone]}>
                    {confirmLabel}
                </button>
            </div>
        </ModalShell>
    );
}

type MessageModalProps = {
    open: boolean;
    title: string;
    message: string;
    onClose: () => void;
};

export function MessageModal({open, title, message, onClose}: MessageModalProps) {
    if (!open) return null;
    return (
        <ModalShell title={title} onClose={onClose}>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{message}</p>
            <button type="button" onClick={onClose} className="btn-primary w-full text-sm">
                OK
            </button>
        </ModalShell>
    );
}

type TextPromptModalProps = {
    open: boolean;
    title: string;
    label: string;
    placeholder?: string;
    onConfirm: (value: string) => void;
    onClose: () => void;
};

export function TextPromptModal({open, ...rest}: TextPromptModalProps) {
    if (!open) return null;
    return <TextPromptModalMounted {...rest} />;
}

function TextPromptModalMounted({title, label, placeholder, onConfirm, onClose}: Omit<TextPromptModalProps, 'open'>) {
    const [value, setValue] = useState('');
    const trimmed = value.trim();
    const inputId = useId();

    const confirm = () => {
        onConfirm(trimmed);
        onClose();
    };

    return (
        <ModalShell title={title} onClose={onClose}>
            <label htmlFor={inputId} className="block text-sm text-slate-600 dark:text-slate-400">
                {label}
            </label>
            <input
                id={inputId}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder={placeholder}
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && trimmed) confirm();
                }}
            />
            <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">
                    Cancel
                </button>
                <button type="button" disabled={!trimmed} onClick={confirm} className="btn-primary flex-1 text-sm">
                    Create
                </button>
            </div>
        </ModalShell>
    );
}
