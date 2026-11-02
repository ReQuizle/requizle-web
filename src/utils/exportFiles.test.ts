import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Subject} from '../types';
import {downloadExport, toFileSlug} from './exportFiles';
import {triggerBlobDownload, triggerJsonDownload} from './download';
import {createRqzlArchiveBlob} from './rqzlArchive';
import {getArchiveMediaEntriesForSubjects} from './archiveMedia';

vi.mock('./download', () => ({triggerBlobDownload: vi.fn(), triggerJsonDownload: vi.fn()}));
vi.mock('./rqzlArchive', () => ({createRqzlArchiveBlob: vi.fn(async () => new Blob(['archive']))}));
vi.mock('./archiveMedia', () => ({getArchiveMediaEntriesForSubjects: vi.fn(async () => [])}));

const subjects: Subject[] = [{id: 's1', name: 'Biology', topics: []}];

beforeEach(() => {
    vi.clearAllMocks();
});

describe('toFileSlug', () => {
    it('lowercases, hyphenates spaces, and drops unsafe characters', () => {
        expect(toFileSlug('My Math 101: Part 2!', 'subject')).toBe('my-math-101-part-2');
    });

    it('uses the fallback when nothing usable is left', () => {
        expect(toFileSlug('???', 'profile')).toBe('profile');
    });
});

describe('downloadExport', () => {
    it('downloads JSON without building an archive', async () => {
        await downloadExport({a: 1}, subjects, 'requizle-subject-biology', {
            includeProgress: true,
            includeMedia: false,
            format: 'json'
        });

        expect(triggerJsonDownload).toHaveBeenCalledWith({a: 1}, 'requizle-subject-biology.json');
        expect(createRqzlArchiveBlob).not.toHaveBeenCalled();
    });

    it('packs the subjects media into an archive when asked to', async () => {
        await downloadExport({a: 1}, subjects, 'requizle-subject-biology', {
            includeProgress: true,
            includeMedia: true,
            format: 'zip'
        });

        expect(getArchiveMediaEntriesForSubjects).toHaveBeenCalledWith(subjects);
        expect(triggerBlobDownload).toHaveBeenCalledWith(expect.any(Blob), 'requizle-subject-biology.zip');
    });

    it('leaves media out of the archive when it is turned off', async () => {
        await downloadExport({a: 1}, subjects, 'requizle-profile-me', {
            includeProgress: false,
            includeMedia: false,
            format: 'rqzl'
        });

        expect(getArchiveMediaEntriesForSubjects).not.toHaveBeenCalled();
        expect(createRqzlArchiveBlob).toHaveBeenCalledWith({a: 1}, []);
        expect(triggerBlobDownload).toHaveBeenCalledWith(expect.any(Blob), 'requizle-profile-me.rqzl');
    });
});
