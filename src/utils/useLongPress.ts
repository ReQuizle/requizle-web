import {useCallback, useEffect, useRef} from 'react';
import type React from 'react';

const LONG_PRESS_MS = 480;
// How far the finger can move before the touch counts as a scroll instead
const MOVE_TOLERANCE_PX = 14;

type Point = {x: number; y: number};

type LongPressOptions<T> = {
    onLongPress: (target: T, coords: Point) => void;
};

/**
 * Touch handlers that call `onLongPress` when a finger rests on an item. The click the browser
 * fires when that finger lifts is swallowed, so the item is not also activated. Returns a function
 * that gives the handlers for one item, to spread onto its element.
 */
export function useLongPress<T>({onLongPress}: LongPressOptions<T>) {
    const onLongPressRef = useRef(onLongPress);
    useEffect(() => {
        onLongPressRef.current = onLongPress;
    }, [onLongPress]);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const originRef = useRef<Point>({x: 0, y: 0});
    const coordsRef = useRef<Point>({x: 0, y: 0});
    const suppressClickRef = useRef(false);

    const cancel = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startLongPress = (target: T, e: React.TouchEvent) => {
        cancel();
        if (e.touches.length !== 1) return;
        const {clientX: x, clientY: y} = e.touches[0];
        originRef.current = {x, y};
        coordsRef.current = {x, y};
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            suppressClickRef.current = true;
            onLongPressRef.current(target, coordsRef.current);
            navigator.vibrate?.(20);
        }, LONG_PRESS_MS);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (!timerRef.current) return;
        const {clientX: x, clientY: y} = e.touches[0];
        coordsRef.current = {x, y};
        const origin = originRef.current;
        if (Math.abs(x - origin.x) > MOVE_TOLERANCE_PX || Math.abs(y - origin.y) > MOVE_TOLERANCE_PX) {
            cancel();
        }
    };

    const onClickCapture = (e: React.MouseEvent) => {
        if (!suppressClickRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        suppressClickRef.current = false;
    };

    useEffect(() => cancel, [cancel]);

    return (target: T) => ({
        onTouchStart: (e: React.TouchEvent) => startLongPress(target, e),
        onTouchMove,
        onTouchEnd: cancel,
        onTouchCancel: cancel,
        onClickCapture
    });
}
