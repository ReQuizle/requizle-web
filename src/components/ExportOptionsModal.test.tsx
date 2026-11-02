import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {ExportOptionsModal} from './ExportOptionsModal';

const renderModal = (onExport = vi.fn()) => {
    render(
        <ExportOptionsModal open title="Export subject" targetLabel="Biology" onClose={vi.fn()} onExport={onExport} />
    );
    return onExport;
};

describe('ExportOptionsModal', () => {
    it('exports with the default options', () => {
        const onExport = renderModal();

        fireEvent.click(screen.getByRole('button', {name: 'Export'}));

        expect(onExport).toHaveBeenCalledWith({includeProgress: true, includeMedia: true, format: 'rqzl'});
    });

    it('blocks a JSON export that still includes media', () => {
        const onExport = renderModal();

        fireEvent.change(screen.getByLabelText('Export format'), {target: {value: 'json'}});
        expect(screen.getByRole('button', {name: 'Export'})).toBeDisabled();

        fireEvent.click(screen.getByLabelText('Include media'));
        fireEvent.click(screen.getByRole('button', {name: 'Export'}));

        expect(onExport).toHaveBeenCalledWith({includeProgress: true, includeMedia: false, format: 'json'});
    });
});
