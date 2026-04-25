import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import type {Profile, Subject, SubjectExportV1} from '../../types';
import {useImportWorkflow} from './useImportWorkflow';
import type {RightSidebarTab} from './SidebarTabs';
import {createRqzlArchiveBlob} from '../../utils/rqzlArchive';

const importProfile = vi.fn<(profile: Profile) => void>();
const importSubjectExport = vi.fn<(bundle: SubjectExportV1) => void>();

function ImportHarness({
    activeTab = 'import',
    importSubjects = vi.fn<(subjects: Subject[]) => void>()
}: {
    activeTab?: RightSidebarTab;
    importSubjects?: (subjects: Subject[]) => void;
}) {
    const workflow = useImportWorkflow({
        activeTab,
        profiles: {},
        subjects: [],
        importProfile,
        importSubjects,
        importSubjectExport
    });

    return (
        <div>
            <input aria-label="Import file" type="file" onChange={workflow.handleFileUpload} />
            <div data-testid="drop-target" onDragEnter={workflow.handleImportDragEnter}>
                {workflow.importDndActive ? 'active' : 'inactive'}
            </div>
            <div>{workflow.importSuccessMessage ?? workflow.importError ?? ''}</div>
        </div>
    );
}

describe('useImportWorkflow', () => {
    it('imports a JSON file while the import lock is active', async () => {
        const importSubjects = vi.fn<(subjects: Subject[]) => void>();
        render(<ImportHarness importSubjects={importSubjects} />);
        const file = new File([
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
        ], 'subject.json', {type: 'application/json'});

        fireEvent.change(screen.getByLabelText('Import file'), {target: {files: [file]}});

        await waitFor(() => {
            expect(importSubjects).toHaveBeenCalledTimes(1);
        });
        expect(importSubjects.mock.calls[0][0][0]).toMatchObject({id: 's1', name: 'Subject'});
        expect(screen.getByText('Added 1 new subject(s)')).toBeInTheDocument();
    });

    it('imports an archive exported with a .zip extension', async () => {
        const importSubjects = vi.fn<(subjects: Subject[]) => void>();
        render(<ImportHarness importSubjects={importSubjects} />);
        const archive = await createRqzlArchiveBlob({
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
        }, []);
        const file = new File([archive], 'subject.zip', {type: 'application/zip'});

        fireEvent.change(screen.getByLabelText('Import file'), {target: {files: [file]}});

        await waitFor(() => {
            expect(importSubjects).toHaveBeenCalledTimes(1);
        });
        expect(importSubjects.mock.calls[0][0][0]).toMatchObject({id: 's1', name: 'Subject'});
        expect(screen.getByText('Added 1 new subject(s)')).toBeInTheDocument();
    });

    it('clears drag state after leaving the import tab', async () => {
        const {rerender} = render(<ImportHarness activeTab="import" />);
        const dropTarget = screen.getByTestId('drop-target');

        fireEvent.dragEnter(dropTarget);
        expect(dropTarget).toHaveTextContent('active');

        rerender(<ImportHarness activeTab="settings" />);
        await waitFor(() => {
            expect(screen.getByTestId('drop-target')).toHaveTextContent('inactive');
        });

        rerender(<ImportHarness activeTab="import" />);
        expect(screen.getByTestId('drop-target')).toHaveTextContent('inactive');
    });
});
