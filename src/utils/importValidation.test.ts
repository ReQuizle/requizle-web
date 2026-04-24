import {describe, it, expect} from 'vitest';
import {
    validateSubjects,
    extractMediaReferencesWithContext,
    getLocalMediaRefs,
    groupMediaByFilename,
    replaceMediaByPath,
    isRemoteOrStoredMedia,
    getFilename,
    isSubjectExportV1,
    sanitizeSubjectProgress,
    validateProfileImport,
    isImportableQuizPayload
} from './importValidation';

describe('importValidation', () => {
    describe('isSubjectExportV1', () => {
        it('accepts export with progress', () => {
            expect(
                isSubjectExportV1({
                    requizleSubjectExport: 1,
                    subject: {id: 's1', name: 'S', topics: []},
                    progress: {}
                })
            ).toBe(true);
        });

        it('accepts export without progress (questions-only share)', () => {
            expect(
                isSubjectExportV1({
                    requizleSubjectExport: 1,
                    subject: {id: 's1', name: 'S', topics: []}
                })
            ).toBe(true);
        });

        it('rejects non-object progress', () => {
            expect(
                isSubjectExportV1({
                    requizleSubjectExport: 1,
                    subject: {id: 's1', name: 'S', topics: []},
                    progress: 'nope'
                })
            ).toBe(false);
        });

        it('rejects invalid subject shape', () => {
            expect(
                isSubjectExportV1({
                    requizleSubjectExport: 1,
                    subject: {id: 's1', name: 'S'}
                })
            ).toBe(false);
        });

        it('rejects malformed progress entries', () => {
            expect(
                isSubjectExportV1({
                    requizleSubjectExport: 1,
                    subject: {
                        id: 's1',
                        name: 'S',
                        topics: [{
                            id: 't1',
                            name: 'T',
                            questions: [{id: 'q1', type: 'true_false', prompt: 'Q?', answer: true}]
                        }]
                    },
                    progress: {
                        t1: {
                            q1: {id: 'q1', attempts: 'many', correctStreak: 1, mastered: true}
                        }
                    }
                })
            ).toBe(false);
        });

        it('rejects progress for unknown questions', () => {
            expect(
                isSubjectExportV1({
                    requizleSubjectExport: 1,
                    subject: {
                        id: 's1',
                        name: 'S',
                        topics: [{
                            id: 't1',
                            name: 'T',
                            questions: [{id: 'q1', type: 'true_false', prompt: 'Q?', answer: true}]
                        }]
                    },
                    progress: {
                        t1: {
                            q2: {id: 'q2', attempts: 1, correctStreak: 1, mastered: true}
                        }
                    }
                })
            ).toBe(false);
        });
    });

    describe('sanitizeSubjectProgress', () => {
        it('keeps valid progress and drops malformed entries', () => {
            const subject = validateSubjects({
                id: 's1',
                name: 'S',
                topics: [{
                    id: 't1',
                    name: 'T',
                    questions: [
                        {id: 'q1', type: 'true_false', prompt: 'Q1?', answer: true},
                        {id: 'q2', type: 'true_false', prompt: 'Q2?', answer: false}
                    ]
                }]
            })[0];

            const progress = sanitizeSubjectProgress(
                {
                    t1: {
                        q1: {id: 'wrong-id', attempts: 2, correctStreak: 1, mastered: true},
                        q2: {id: 'q2', attempts: 'bad', correctStreak: 0, mastered: false}
                    },
                    missingTopic: {
                        q3: {id: 'q3', attempts: 1, correctStreak: 1, mastered: true}
                    }
                },
                subject
            );

            expect(progress).toEqual({
                t1: {
                    q1: {id: 'q1', attempts: 2, correctStreak: 1, mastered: true}
                }
            });
        });
    });

    describe('validateProfileImport', () => {
        it('sanitizes profile imports and strips transport-only fields', () => {
            const profile = validateProfileImport({
                id: ' imported ',
                name: ' Imported Profile ',
                createdAt: 123,
                subjects: [{
                    id: 's1',
                    name: 'S',
                    topics: [{
                        id: 't1',
                        name: 'T',
                        questions: [
                            {id: 'q1', type: 'true_false', prompt: 'Q1?', answer: true},
                            {id: 'q2', type: 'true_false', prompt: 'Q2?', answer: false}
                        ]
                    }]
                }],
                progress: {
                    s1: {
                        t1: {
                            q1: {id: 'q1', attempts: 2, correctStreak: 1, mastered: true},
                            q2: {id: 'q2', attempts: 'bad', correctStreak: 0, mastered: false},
                            q3: {id: 'q3', attempts: 1, correctStreak: 1, mastered: true}
                        }
                    },
                    rogueSubject: {
                        t1: {
                            q1: {id: 'q1', attempts: 1, correctStreak: 1, mastered: true}
                        }
                    }
                },
                session: {
                    subjectId: 's1',
                    selectedTopicIds: ['t1', 'missing-topic', 42],
                    mode: 'invalid-mode',
                    includeMastered: 'yes',
                    queue: ['q1', 'missing-question', 42],
                    currentQuestionId: 'q2',
                    turnCounter: -1
                },
                _media: [{id: 'm1', filename: 'image.png', mimeType: 'image/png', dataBase64: 'abc'}]
            });

            expect(profile).toMatchObject({
                id: 'imported',
                name: 'Imported Profile',
                createdAt: 123,
                progress: {
                    s1: {
                        t1: {
                            q1: {id: 'q1', attempts: 2, correctStreak: 1, mastered: true}
                        }
                    }
                },
                session: {
                    subjectId: 's1',
                    selectedTopicIds: ['t1'],
                    mode: 'topic_order',
                    includeMastered: false,
                    queue: ['q1'],
                    currentQuestionId: 'q2',
                    turnCounter: 0
                }
            });
            expect(profile).not.toHaveProperty('_media');
            expect(profile.progress.s1?.t1?.q2).toBeUndefined();
            expect(profile.progress.s1?.t1?.q3).toBeUndefined();
            expect(profile.progress.rogueSubject).toBeUndefined();
        });

        it('rejects malformed profile imports', () => {
            expect(() => validateProfileImport({
                id: '',
                name: 'Profile',
                subjects: []
            })).toThrow(/id/);

            expect(() => validateProfileImport({
                id: 'p1',
                name: 'Profile',
                subjects: [{id: 's1', name: 'Broken'}]
            })).toThrow(/topics/);
        });
    });

    describe('isImportableQuizPayload', () => {
        it('accepts valid subject, profile, and subject-export payloads', () => {
            const subject = {
                id: 's1',
                name: 'S',
                topics: [{
                    id: 't1',
                    name: 'T',
                    questions: [{id: 'q1', type: 'true_false', prompt: 'Q?', answer: true}]
                }]
            };

            expect(isImportableQuizPayload(subject)).toBe(true);
            expect(isImportableQuizPayload({
                id: 'p1',
                name: 'Profile',
                subjects: [subject],
                progress: {},
                session: {},
                createdAt: 123
            })).toBe(true);
            expect(isImportableQuizPayload({
                requizleSubjectExport: 1,
                subject
            })).toBe(true);
        });

        it('rejects invalid payloads before media restoration', () => {
            expect(isImportableQuizPayload({
                _media: [{id: 'm1', filename: 'image.png', mimeType: 'image/png', dataBase64: 'abc'}],
                subjects: [{id: 's1', name: 'Broken'}]
            })).toBe(false);
        });
    });

    describe('isRemoteOrStoredMedia', () => {
        it('should identify HTTP URLs', () => {
            expect(isRemoteOrStoredMedia('http://example.com/image.png')).toBe(true);
        });

        it('should identify HTTPS URLs', () => {
            expect(isRemoteOrStoredMedia('https://example.com/image.png')).toBe(true);
        });

        it('should identify data URIs', () => {
            expect(isRemoteOrStoredMedia('data:image/png;base64,abc123')).toBe(true);
        });

        it('should identify IndexedDB references', () => {
            expect(isRemoteOrStoredMedia('idb:media-12345')).toBe(true);
        });

        it('should identify local paths as not remote/stored', () => {
            expect(isRemoteOrStoredMedia('images/photo.png')).toBe(false);
            expect(isRemoteOrStoredMedia('./image.jpg')).toBe(false);
        });
    });

    describe('getFilename', () => {
        it('should extract filename from forward slash path', () => {
            expect(getFilename('images/subfolder/photo.png')).toBe('photo.png');
        });

        it('should extract filename from backslash path', () => {
            expect(getFilename('images\\subfolder\\photo.png')).toBe('photo.png');
        });

        it('should return the string if no separator', () => {
            expect(getFilename('photo.png')).toBe('photo.png');
        });
    });

    describe('validateSubjects', () => {
        it('should validate a valid subject array', () => {
            const data = [{
                name: 'Math',
                topics: [{
                    name: 'Algebra',
                    questions: [{
                        type: 'multiple_choice',
                        prompt: 'What is 2+2?',
                        choices: ['3', '4', '5'],
                        answerIndex: 1
                    }]
                }]
            }];

            const result = validateSubjects(data);
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Math');
            expect(result[0].topics[0].questions[0].prompt).toBe('What is 2+2?');
        });

        it('should accept "question" as alias for "prompt"', () => {
            const data = [{
                name: 'Test',
                topics: [{
                    name: 'Topic',
                    questions: [{
                        type: 'true_false',
                        question: 'Is the sky blue?',
                        answer: true
                    }]
                }]
            }];

            const result = validateSubjects(data);
            expect(result[0].topics[0].questions[0].prompt).toBe('Is the sky blue?');
        });

        it('should throw on invalid question type', () => {
            const data = [{
                name: 'Test',
                topics: [{
                    name: 'Topic',
                    questions: [{
                        type: 'invalid_type',
                        prompt: 'Question?'
                    }]
                }]
            }];

            expect(() => validateSubjects(data)).toThrow(/Missing or invalid "type"/);
        });

        it('should reject non-string answer content that would break rendering', () => {
            expect(() => validateSubjects([{
                name: 'Test',
                topics: [{
                    name: 'Topic',
                    questions: [{
                        type: 'multiple_choice',
                        prompt: 'Question?',
                        choices: ['A', 123],
                        answerIndex: 0
                    }]
                }]
            }])).toThrow(/choices/);

            expect(() => validateSubjects([{
                name: 'Test',
                topics: [{
                    name: 'Topic',
                    questions: [{
                        type: 'keywords',
                        prompt: 'Question?',
                        answer: ['ok', 123]
                    }]
                }]
            }])).toThrow(/array must contain strings/);

            expect(() => validateSubjects([{
                name: 'Test',
                topics: [{
                    name: 'Topic',
                    questions: [{
                        type: 'word_bank',
                        prompt: 'Question?',
                        sentence: 'A _',
                        wordBank: ['A'],
                        answers: [123]
                    }]
                }]
            }])).toThrow(/answers/);
        });

        it('should reject fractional answer indices', () => {
            expect(() => validateSubjects([{
                name: 'Test',
                topics: [{
                    name: 'Topic',
                    questions: [{
                        type: 'multiple_choice',
                        prompt: 'Question?',
                        choices: ['A', 'B'],
                        answerIndex: 0.5
                    }]
                }]
            }])).toThrow(/answerIndex/);

            expect(() => validateSubjects([{
                name: 'Test',
                topics: [{
                    name: 'Topic',
                    questions: [{
                        type: 'multiple_answer',
                        prompt: 'Question?',
                        choices: ['A', 'B'],
                        answerIndices: [0.5]
                    }]
                }]
            }])).toThrow(/answerIndices/);
        });

        it('should reject impossible answer definitions', () => {
            expect(() => validateSubjects([{
                name: 'Test',
                topics: [{
                    name: 'Topic',
                    questions: [{
                        type: 'multiple_answer',
                        prompt: 'Question?',
                        choices: ['A', 'B'],
                        answerIndices: [0, 0]
                    }]
                }]
            }])).toThrow(/duplicate/);

            expect(() => validateSubjects([{
                name: 'Test',
                topics: [{
                    name: 'Topic',
                    questions: [{
                        type: 'matching',
                        prompt: 'Question?',
                        pairs: [
                            {left: 'A', right: '1'},
                            {left: 'A', right: '2'}
                        ]
                    }]
                }]
            }])).toThrow(/unique/);

            expect(() => validateSubjects([{
                name: 'Test',
                topics: [{
                    name: 'Topic',
                    questions: [{
                        type: 'word_bank',
                        prompt: 'Question?',
                        sentence: '_ and _',
                        wordBank: ['same'],
                        answers: ['same', 'same']
                    }]
                }]
            }])).toThrow(/wordBank/);
        });

        it('should generate IDs when not provided', () => {
            const data = [{
                name: 'Test',
                topics: [{
                    name: 'Topic',
                    questions: [{
                        type: 'true_false',
                        prompt: 'Question?',
                        answer: true
                    }]
                }]
            }];

            const result = validateSubjects(data);
            expect(result[0].id).toBeDefined();
            expect(result[0].topics[0].id).toBeDefined();
            expect(result[0].topics[0].questions[0].id).toBeDefined();
        });

        it('should preserve provided IDs', () => {
            const data = [{
                id: 'my-subject',
                name: 'Test',
                topics: [{
                    id: 'my-topic',
                    name: 'Topic',
                    questions: [{
                        id: 'my-question',
                        type: 'true_false',
                        prompt: 'Question?',
                        answer: true
                    }]
                }]
            }];

            const result = validateSubjects(data);
            expect(result[0].id).toBe('my-subject');
            expect(result[0].topics[0].id).toBe('my-topic');
            expect(result[0].topics[0].questions[0].id).toBe('my-question');
        });

        it('should validate all question types', () => {
            const data = [{
                name: 'Test',
                topics: [{
                    name: 'Topic',
                    questions: [
                        {type: 'multiple_choice', prompt: 'Q1', choices: ['A', 'B'], answerIndex: 0},
                        {type: 'multiple_answer', prompt: 'Q2', choices: ['A', 'B', 'C'], answerIndices: [0, 2]},
                        {type: 'true_false', prompt: 'Q3', answer: false},
                        {type: 'keywords', prompt: 'Q4', answer: 'keyword'},
                        {type: 'matching', prompt: 'Q5', pairs: [{left: 'A', right: '1'}]},
                        {type: 'word_bank', prompt: 'Q6', sentence: 'Fill in _', wordBank: ['word'], answers: ['word']}
                    ]
                }]
            }];

            const result = validateSubjects(data);
            expect(result[0].topics[0].questions).toHaveLength(6);
        });
    });

    describe('extractMediaReferencesWithContext', () => {
        it('should extract media references from subjects', () => {
            const data = [{
                name: 'Subject1',
                topics: [{
                    name: 'Topic1',
                    questions: [
                        {prompt: 'Q1', media: 'images/photo1.png'},
                        {prompt: 'Q2', media: 'images/photo2.png'}
                    ]
                }]
            }];

            const refs = extractMediaReferencesWithContext(data);
            expect(refs).toHaveLength(2);
            expect(refs[0].path).toBe('images/photo1.png');
            expect(refs[0].filename).toBe('photo1.png');
            expect(refs[0].subjectName).toBe('Subject1');
            expect(refs[0].topicName).toBe('Topic1');
        });

        it('should handle profile format with subjects field', () => {
            const data = {
                name: 'Profile',
                subjects: [{
                    name: 'Subject1',
                    topics: [{
                        name: 'Topic1',
                        questions: [{prompt: 'Q1', media: 'image.png'}]
                    }]
                }]
            };

            const refs = extractMediaReferencesWithContext(data);
            expect(refs).toHaveLength(1);
        });
    });

    describe('getLocalMediaRefs', () => {
        it('should filter out remote URLs', () => {
            const refs = [
                {path: 'local/image.png', filename: 'image.png', subjectName: 'S', topicName: 'T'},
                {path: 'https://example.com/image.png', filename: 'image.png', subjectName: 'S', topicName: 'T'},
                {path: 'data:image/png;base64,abc', filename: '', subjectName: 'S', topicName: 'T'}
            ];

            const localRefs = getLocalMediaRefs(refs);
            expect(localRefs).toHaveLength(1);
            expect(localRefs[0].path).toBe('local/image.png');
        });
    });

    describe('groupMediaByFilename', () => {
        it('should group media by filename', () => {
            const refs = [
                {path: 'folder1/image.png', filename: 'image.png', subjectName: 'S1', topicName: 'T1'},
                {path: 'folder2/image.png', filename: 'image.png', subjectName: 'S2', topicName: 'T2'},
                {path: 'folder1/other.png', filename: 'other.png', subjectName: 'S1', topicName: 'T1'}
            ];

            const groups = groupMediaByFilename(refs);
            expect(groups).toHaveLength(2);

            const imageGroup = groups.find(g => g.filename === 'image.png');
            expect(imageGroup?.references).toHaveLength(2);
            expect(imageGroup?.isConflict).toBe(true); // Different paths
        });

        it('should not mark as conflict if same path', () => {
            const refs = [
                {path: 'images/image.png', filename: 'image.png', subjectName: 'S1', topicName: 'T1'},
                {path: 'images/image.png', filename: 'image.png', subjectName: 'S2', topicName: 'T2'}
            ];

            const groups = groupMediaByFilename(refs);
            expect(groups[0].isConflict).toBe(false);
        });
    });

    describe('replaceMediaByPath', () => {
        it('should replace media paths in nested data', () => {
            const data = {
                topics: [{
                    questions: [
                        {prompt: 'Q1', media: 'images/photo.png'},
                        {prompt: 'Q2', media: 'images/other.png'}
                    ]
                }]
            };

            const mediaMap = new Map([
                ['images/photo.png', 'idb:new-id-123']
            ]);

            const result = replaceMediaByPath(data, mediaMap) as typeof data;
            expect(result.topics[0].questions[0].media).toBe('idb:new-id-123');
            expect(result.topics[0].questions[1].media).toBe('images/other.png'); // Not replaced
        });

        it('should handle arrays', () => {
            const data = [
                {media: 'a.png'},
                {media: 'b.png'}
            ];

            const mediaMap = new Map([['a.png', 'idb:a'], ['b.png', 'idb:b']]);

            const result = replaceMediaByPath(data, mediaMap) as typeof data;
            expect(result[0].media).toBe('idb:a');
            expect(result[1].media).toBe('idb:b');
        });
    });
});
