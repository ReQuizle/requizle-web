import React, {useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {useModalA11y} from './modalA11y';

export const modalOverlayClass = 'fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4';
export const modalPanelClass = 'bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4';

type ModalShellProps = {
    titleId?: string;
    ariaLabel?: string;
    onClose: () => void;
    dialogRef: React.RefObject<HTMLDivElement | null>;
    panelClassName?: string;
    closeOnOverlayMouseDown?: boolean;
    children: React.ReactNode;
};

export function ModalShell({
    titleId,
    ariaLabel,
    onClose,
    dialogRef,
    panelClassName = modalPanelClass,
    closeOnOverlayMouseDown = true,
    children
}: ModalShellProps) {
    return createPortal(
        <div
            className={modalOverlayClass}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-label={ariaLabel}
            onMouseDown={e => {
                if (closeOnOverlayMouseDown && e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className={panelClassName}
            >
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
    /** User must type this string exactly (e.g. subject name). */
    phraseToMatch: string;
    inputPlaceholder?: string;
    cancelLabel?: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onClose: () => void;
};

/** Renders nothing when closed so the inner form remounts with a fresh input each open. */
export function TypeToConfirmModal({open, ...rest}: TypeToConfirmModalProps) {
    if (!open) return null;
    return <TypeToConfirmModalMounted {...rest} />;
}

function TypeToConfirmModalMounted({
    title,
    description,
    phraseToMatch,
    inputPlaceholder = 'Type to confirm...',
    cancelLabel = 'Cancel',
    confirmLabel = 'Delete',
    onConfirm,
    onClose
}: Omit<TypeToConfirmModalProps, 'open'>) {
    const [input, setInput] = useState('');
    const canConfirm = input === phraseToMatch;
    const titleId = useId();
    const inputId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    useModalA11y(dialogRef, onClose);

    return (
        <ModalShell titleId={titleId} onClose={onClose} dialogRef={dialogRef}>
                <h3 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">
                    {title}
                </h3>
                <div className="text-sm text-slate-600 dark:text-slate-400">{description}</div>
                <div className="space-y-2">
                    <label htmlFor={inputId} className="text-sm text-slate-600 dark:text-slate-400">
                        Type <strong className="text-red-600 dark:text-red-400">{phraseToMatch}</strong> to confirm:
                    </label>
                    <input
                        id={inputId}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        placeholder={inputPlaceholder}
                        autoFocus
                    />
                </div>
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (canConfirm) onConfirm();
                        }}
                        disabled={!canConfirm}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-900 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        {confirmLabel}
                    </button>
                </div>
        </ModalShell>
    );
}

type SimpleConfirmModalProps = {
    open: boolean;
    title: string;
    children: React.ReactNode;
    cancelLabel?: string;
    confirmLabel: string;
    /** Tailwind classes for the confirm button (default: red destructive). */
    confirmClassName?: string;
    onConfirm: () => void;
    onClose: () => void;
};

export function SimpleConfirmModal({
    open,
    ...rest
}: SimpleConfirmModalProps) {
    if (!open) return null;
    return <SimpleConfirmModalMounted {...rest} />;
}

function SimpleConfirmModalMounted({
    title,
    children,
    cancelLabel = 'Cancel',
    confirmLabel,
    confirmClassName = 'flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors',
    onConfirm,
    onClose
}: Omit<SimpleConfirmModalProps, 'open'>) {
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    useModalA11y(dialogRef, onClose);

    return (
        <ModalShell titleId={titleId} onClose={onClose} dialogRef={dialogRef}>
                <h3 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">
                    {title}
                </h3>
                <div className="text-sm text-slate-600 dark:text-slate-400">{children}</div>
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button type="button" onClick={onConfirm} className={confirmClassName}>
                        {confirmLabel}
                    </button>
                </div>
        </ModalShell>
    );
}

type MessageModalProps = {
    open: boolean;
    title?: string;
    message: string;
    buttonLabel?: string;
    onClose: () => void;
};

export function MessageModal({open, title, message, buttonLabel = 'OK', onClose}: MessageModalProps) {
    if (!open) return null;
    return (
        <MessageModalMounted
            title={title}
            message={message}
            buttonLabel={buttonLabel}
            onClose={onClose}
        />
    );
}

function MessageModalMounted({title, message, buttonLabel = 'OK', onClose}: Omit<MessageModalProps, 'open'>) {
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    useModalA11y(dialogRef, onClose);

    return (
        <ModalShell
            titleId={title ? titleId : undefined}
            ariaLabel={title ? undefined : 'Message'}
            onClose={onClose}
            dialogRef={dialogRef}
        >
                {title && (
                    <h3 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">
                        {title}
                    </h3>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{message}</p>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                    {buttonLabel}
                </button>
        </ModalShell>
    );
}

type TextPromptModalProps = {
    open: boolean;
    title: string;
    label?: string;
    placeholder?: string;
    initialValue?: string;
    cancelLabel?: string;
    confirmLabel?: string;
    onConfirm: (value: string) => void;
    onClose: () => void;
};

export function TextPromptModal({open, ...rest}: TextPromptModalProps) {
    if (!open) return null;
    return <TextPromptModalMounted {...rest} />;
}

function TextPromptModalMounted({
    title,
    label,
    placeholder,
    initialValue = '',
    cancelLabel = 'Cancel',
    confirmLabel = 'Create',
    onConfirm,
    onClose
}: Omit<TextPromptModalProps, 'open'>) {
    const [value, setValue] = useState(initialValue);
    const trimmed = value.trim();
    const titleId = useId();
    const inputId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    useModalA11y(dialogRef, onClose);

    return (
        <ModalShell titleId={titleId} onClose={onClose} dialogRef={dialogRef}>
                <h3 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">
                    {title}
                </h3>
                {label && (
                    <label htmlFor={inputId} className="block text-sm text-slate-600 dark:text-slate-400">
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    type="text"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder={placeholder}
                    autoFocus
                    onKeyDown={e => {
                        if (e.key === 'Enter' && trimmed) {
                            onConfirm(trimmed);
                            onClose();
                        }
                    }}
                />
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        disabled={!trimmed}
                        onClick={() => {
                            onConfirm(trimmed);
                            onClose();
                        }}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        {confirmLabel}
                    </button>
                </div>
        </ModalShell>
    );
}
