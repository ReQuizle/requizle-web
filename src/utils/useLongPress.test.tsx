import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {useLongPress} from './useLongPress';

type ItemProps = {
    onLongPress: (target: string, coords: {x: number; y: number}) => void;
    onClick: () => void;
};

function Item({onLongPress, onClick}: ItemProps) {
    const longPressHandlers = useLongPress<string>({onLongPress});
    return (
        <button type="button" onClick={onClick} {...longPressHandlers('item')}>
            Item
        </button>
    );
}

const touchAt = (x: number, y: number) => ({touches: [{clientX: x, clientY: y}]});

describe('useLongPress', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('reports where the finger rests and swallows the click when it lifts', () => {
        const onLongPress = vi.fn();
        const onClick = vi.fn();
        render(<Item onLongPress={onLongPress} onClick={onClick} />);
        const item = screen.getByRole('button', {name: 'Item'});

        fireEvent.touchStart(item, touchAt(10, 20));
        fireEvent.touchMove(item, touchAt(15, 24));
        vi.advanceTimersByTime(500);
        fireEvent.touchEnd(item);
        fireEvent.click(item);

        expect(onLongPress).toHaveBeenCalledWith('item', {x: 15, y: 24});
        expect(onClick).not.toHaveBeenCalled();

        fireEvent.click(item);
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('ignores a tap and a scroll', () => {
        const onLongPress = vi.fn();
        const onClick = vi.fn();
        render(<Item onLongPress={onLongPress} onClick={onClick} />);
        const item = screen.getByRole('button', {name: 'Item'});

        fireEvent.touchStart(item, touchAt(10, 20));
        vi.advanceTimersByTime(200);
        fireEvent.touchEnd(item);
        fireEvent.touchStart(item, touchAt(10, 20));
        fireEvent.touchMove(item, touchAt(10, 60));
        vi.advanceTimersByTime(500);
        fireEvent.click(item);

        expect(onLongPress).not.toHaveBeenCalled();
        expect(onClick).toHaveBeenCalledOnce();
    });
});
