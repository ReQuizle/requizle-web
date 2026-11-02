import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {ImportPanel} from './ImportPanel';

describe('ImportPanel', () => {
    it('imports a file dropped on it', () => {
        const importFile = vi.fn<(file: File) => void>();
        render(
            <ImportPanel
                jsonInput=""
                setJsonInput={vi.fn()}
                importError={null}
                isImporting={false}
                handleImport={vi.fn()}
                handleFileUpload={vi.fn()}
                importFile={importFile}
            />
        );
        const file = new File(['{}'], 'quiz.json', {type: 'application/json'});

        fireEvent.drop(screen.getByRole('group', {name: 'Drop a quiz file here or choose from device'}), {
            dataTransfer: {files: [file]}
        });

        expect(importFile).toHaveBeenCalledWith(file);
    });
});
