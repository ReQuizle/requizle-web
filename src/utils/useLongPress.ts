import {useCallback, useEffect, useRef} from 'react';
import type React from 'react';

type LongPressOptions<T> = {
    onLongPress: (target: T, coords: {x: number; y: number}) => void;
    durationMs?: number;
    movePx?: number;
};

export type LongPressHandlers<T> = {
    startLongPress: (target: T, e: React.TouchEvent) => void;
    onLongPressTouchMove: (e: React.TouchEvent) => void;
    onLongPressTouchEnd: () => void;
    swallowSyntheticClickAfterLongPress: (e: React.MouseEvent) => void;
};

export function useLongPress<T>({
    onLongPress,
    durationMs = 480,
    movePx = 14
}: LongPressOptions<T>): LongPressHandlers<T> {
    const onLongPressRef = useRef(onLongPress);
    useEffect(() => {
        onLongPressRef.current = onLongPress;
    }, [onLongPress]);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const originRef = useRef<{x: number; y: number} | null>(null);
    const coordsRef = useRef<{x: number; y: number}>({x: 0, y: 0});
    const targetRef = useRef<T | null>(null);
    const suppressClickRef = useRef(false);

    const killTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const reset = useCallback(() => {
        killTimer();
        originRef.current = null;
        targetRef.current = null;
    }, [killTimer]);

    const startLongPress = useCallback(
        (target: T, e: React.TouchEvent) => {
            if (e.touches.length !== 1) {
                reset();
                return;
            }
            reset();
            const t = e.touches[0];
            targetRef.current = target;
            originRef.current = {x: t.clientX, y: t.clientY};
            coordsRef.current = {x: t.clientX, y: t.clientY};
            timerRef.current = setTimeout(() => {
                timerRef.current = null;
                const tgt = targetRef.current;
                const coords = coordsRef.current;
                targetRef.current = null;
                originRef.current = null;
                if (tgt == null) return;
                suppressClickRef.current = true;
                onLongPressRef.current(tgt, coords);
                try {
                    navigator.vibrate?.(20);
                } catch {
                    /* vibrate is best-effort */
                }
            }, durationMs);
        },
        [durationMs, reset]
    );

    const onLongPressTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (!timerRef.current || !originRef.current) return;
            const t = e.touches[0];
            if (!t) return;
            coordsRef.current = {x: t.clientX, y: t.clientY};
            const o = originRef.current;
            if (Math.abs(t.clientX - o.x) > movePx || Math.abs(t.clientY - o.y) > movePx) {
                reset();
            }
        },
        [movePx, reset]
    );

    const onLongPressTouchEnd = useCallback(() => {
        if (timerRef.current) {
            reset();
        }
    }, [reset]);

    const swallowSyntheticClickAfterLongPress = useCallback((e: React.MouseEvent) => {
        if (!suppressClickRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        suppressClickRef.current = false;
    }, []);

    useEffect(() => () => reset(), [reset]);

    return {startLongPress, onLongPressTouchMove, onLongPressTouchEnd, swallowSyntheticClickAfterLongPress};
}
