import {useEffect, useRef} from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.getAttribute('aria-hidden') !== 'true'
    );
}

/** Handles a Tab key press so focus wraps around instead of leaving the container. */
export function keepFocusInside(e: KeyboardEvent, container: HTMLElement): void {
    const focusable = getFocusableElements(container);
    if (focusable.length === 0) {
        e.preventDefault();
        container.focus();
        return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Shift+Tab from the container itself would otherwise move focus out of it
    if (e.shiftKey && (document.activeElement === first || document.activeElement === container)) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

export function useModalA11y(containerRef: React.RefObject<HTMLElement | null>, onClose: () => void) {
    // Stabilize close handler: a new inline `onClose` each render would re-run the focus-trap effect.
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const previousActiveElement = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        (getFocusableElements(container)[0] ?? container).focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCloseRef.current();
                return;
            }
            if (e.key === 'Tab') keepFocusInside(e, container);
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
            previousActiveElement?.focus();
        };
    }, [containerRef]);
}
