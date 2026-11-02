import 'fake-indexeddb/auto';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import type {Profile, Subject, SubjectExportV1} from '../../types';
import {useImportWorkflow} from './useImportWorkflow';
import {createRqzlArchiveBlob} from '../../utils/rqzlArchive';

const importProfile = vi.fn<(profile: Profile) => void>();
const importSubjectExport = vi.fn<(bundle: SubjectExportV1) => void>();

function ImportHarness({
    importSubjects = vi.fn<(subjects: Subject[]) => void>()
}: {
    importSubjects?: (subjects: Subject[]) => void;
}) {
    const workflow = useImportWorkflow({
        profiles: {},
        subjects: [],
        importProfile,
        importSubjects,
        importSubjectExport
    });

    return (
        <div>
            <input aria-label="Import file" type="file" onChange={workflow.handleFileUpload} />
            <div>{workflow.importSuccessMessage ?? workflow.importError ?? ''}</div>
            <div data-testid="pending">
                {workflow.pendingImport?.mediaGroups.map((g) => `${g.filename}:${g.uploaded}`).join(',') ?? 'none'}
            </div>
            <input aria-label="Media file" type="file" onChange={(e) => workflow.handleSingleUpload(0, e)} />
            <button type="button" onClick={() => void workflow.completePendingImport()}>
                Complete
            </button>
        </div>
    );
}

function subjectFile(media?: string): File {
    const subject = {
        id: 's1',
        name: 'Subject',
        topics: [
            {
                id: 't1',
                name: 'Topic',
                questions: [{id: 'q1', type: 'true_false', prompt: 'Question?', answer: true, media}]
            }
        ]
    };
    return new File([JSON.stringify(subject)], 'subject.json', {type: 'application/json'});
}

describe('useImportWorkflow', () => {
    it('imports a JSON file while the import lock is active', async () => {
        const importSubjects = vi.fn<(subjects: Subject[]) => void>();
        render(<ImportHarness importSubjects={importSubjects} />);
        const file = new File(
            [
                JSON.stringify({
                    id: 's1',
                    name: 'Subject',
                    topics: [
                        {
                            id: 't1',
                            name: 'Topic',
                            questions: [
                                {
                                    id: 'q1',
                                    type: 'true_false',
                                    prompt: 'Question?',
                                    answer: true
                                }
                            ]
                        }
                    ]
                })
            ],
            'subject.json',
            {type: 'application/json'}
        );

        fireEvent.change(screen.getByLabelText('Import file'), {target: {files: [file]}});

        await waitFor(() => {
            expect(importSubjects).toHaveBeenCalledTimes(1);
        });
        expect(importSubjects.mock.calls[0][0][0]).toMatchObject({id: 's1', name: 'Subject'});
        expect(screen.getByText('Added 1 new subject.')).toBeInTheDocument();
    });

    it('imports an archive exported with a .zip extension', async () => {
        const importSubjects = vi.fn<(subjects: Subject[]) => void>();
        render(<ImportHarness importSubjects={importSubjects} />);
        const archive = await createRqzlArchiveBlob(
            {
                id: 's1',
                name: 'Subject',
                topics: [
                    {
                        id: 't1',
                        name: 'Topic',
                        questions: [
                            {
                                id: 'q1',
                                type: 'true_false',
                                prompt: 'Question?',
                                answer: true
                            }
                        ]
                    }
                ]
            },
            []
        );
        const file = new File([archive], 'subject.zip', {type: 'application/zip'});

        fireEvent.change(screen.getByLabelText('Import file'), {target: {files: [file]}});

        await waitFor(() => {
            expect(importSubjects).toHaveBeenCalledTimes(1);
        });
        expect(importSubjects.mock.calls[0][0][0]).toMatchObject({id: 's1', name: 'Subject'});
        expect(screen.getByText('Added 1 new subject.')).toBeInTheDocument();
    });

    it('reports a JSON file that is not a quiz', async () => {
        render(<ImportHarness />);
        const file = new File(['{"not": "a quiz"}'], 'notes.json', {type: 'application/json'});

        fireEvent.change(screen.getByLabelText('Import file'), {target: {files: [file]}});

        expect(
            await screen.findByText(
                'File import failed: Invalid import format: expected a profile, subject export, subject, or subject array'
            )
        ).toBeInTheDocument();
    });

    it('reports a file that cannot be read', async () => {
        render(<ImportHarness />);
        const file = subjectFile();
        file.text = () => Promise.reject(new Error('Permission denied'));

        fireEvent.change(screen.getByLabelText('Import file'), {target: {files: [file]}});

        expect(
            await screen.findByText('Could not read that file. Try choosing it again, or use another file.')
        ).toBeInTheDocument();
    });

    it('waits for local media files, then imports with stored media', async () => {
        const importSubjects = vi.fn<(subjects: Subject[]) => void>();
        render(<ImportHarness importSubjects={importSubjects} />);

        fireEvent.change(screen.getByLabelText('Import file'), {target: {files: [subjectFile('images/diagram.png')]}});
        await waitFor(() => {
            expect(screen.getByTestId('pending')).toHaveTextContent('diagram.png:false');
        });
        expect(importSubjects).not.toHaveBeenCalled();

        const image = new File(['png bytes'], 'diagram.png', {type: 'image/png'});
        fireEvent.change(screen.getByLabelText('Media file'), {target: {files: [image]}});
        expect(screen.getByTestId('pending')).toHaveTextContent('diagram.png:true');

        fireEvent.click(screen.getByRole('button', {name: 'Complete'}));
        await waitFor(() => {
            expect(importSubjects).toHaveBeenCalledTimes(1);
        });
        expect(importSubjects.mock.calls[0][0][0].topics[0].questions[0].media).toMatch(/^idb:media-/);
        expect(screen.getByTestId('pending')).toHaveTextContent('none');
        expect(screen.getByText('Added 1 new subject.')).toBeInTheDocument();
    });
});
