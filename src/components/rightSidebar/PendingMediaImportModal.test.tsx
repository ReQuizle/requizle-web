import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {useRef, useState} from 'react';
import {PendingMediaImportModal} from './PendingMediaImportModal';

function ModalHarness() {
    const [open, setOpen] = useState(true);
    const imageInputRef = useRef<HTMLInputElement>(null);
    return (
        <div>
            <button type="button">outside button</button>
            <PendingMediaImportModal
                pendingImport={
                    open
                        ? {
                            data: {},
                            mediaGroups: [
                                {
                                    filename: 'example.png',
                                    references: [{path: 'images/example.png', filename: 'example.png', subjectName: 'S1', topicName: 'T1'}],
                                    isConflict: false,
                                    uploaded: false
                                }
                            ],
                            uploadError: null
                        }
                        : null
                }
                isCompleting={false}
                imageInputRef={imageInputRef}
                onCancel={() => setOpen(false)}
                onConflictUpload={vi.fn()}
                onSingleUpload={vi.fn()}
                onBulkUpload={vi.fn()}
                onCompleteImport={vi.fn()}
            />
        </div>
    );
}

describe('PendingMediaImportModal', () => {
    it('renders with dialog semantics and closes on Escape', () => {
        render(<ModalHarness />);

        const dialog = screen.getByRole('dialog', {name: 'Upload Media'});
        expect(dialog).toBeInTheDocument();

        fireEvent.keyDown(document, {key: 'Escape'});
        expect(screen.queryByRole('dialog', {name: 'Upload Media'})).not.toBeInTheDocument();
    });

    it('traps tab focus inside the modal', () => {
        render(<ModalHarness />);

        const outsideButton = screen.getByRole('button', {name: 'outside button'});
        const cancelButton = screen.getByRole('button', {name: 'Cancel'});
        cancelButton.focus();
        expect(document.activeElement).toBe(cancelButton);

        fireEvent.keyDown(document, {key: 'Tab', shiftKey: true});
        expect(document.activeElement).not.toBe(outsideButton);
        expect(screen.getByRole('dialog', {name: 'Upload Media'}).contains(document.activeElement)).toBe(true);
    });
});
