/**
 * Import validation utilities for parsing and validating JSON quiz data.
 */

import type {Subject, Question, QuestionType, Topic, SubjectExportV1} from '../types';

/** Media reference with context about where it's used */
export interface MediaReference {
    path: string;           // Full path from JSON (e.g., "images/image.png")
    filename: string;       // Just the filename
    subjectName: string;
    topicName: string;
}

/** Grouped media by filename for display */
export interface MediaGroup {
    filename: string;
    references: MediaReference[];
    isConflict: boolean;    // Same filename, different paths
    uploaded: boolean;
    uploadedDataUri?: string;
}

/** Check if a media reference is a remote URL, data URI, or IndexedDB reference */
export const isRemoteOrStoredMedia = (media: string): boolean => {
    return media.startsWith('http://') ||
        media.startsWith('https://') ||
        media.startsWith('data:') ||
        media.startsWith('idb:');
};

/** Extract filename from path (handles both / and \ separators) */
export const getFilename = (path: string): string => {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
};

export const isSubjectExportV1 = (data: unknown): data is SubjectExportV1 => {
    if (typeof data !== 'object' || data === null) return false;
    const o = data as Record<string, unknown>;
    const progressOk =
        o.progress === undefined || (typeof o.progress === 'object' && o.progress !== null);
    return (
        o.requizleSubjectExport === 1 &&
        typeof o.subject === 'object' &&
        o.subject !== null &&
        progressOk
    );
};

/** Validate and parse imported subject data */
export const validateSubjects = (data: unknown): Subject[] => {
    if (!Array.isArray(data) && (typeof data !== 'object' || data === null)) {
        throw new Error('Invalid format: Expected an object or array of subjects');
    }

    const subjectsToValidate = Array.isArray(data) ? data : [data];

    const validQuestionTypes: QuestionType[] = [
        'multiple_choice',
        'multiple_answer',
        'keywords',
        'true_false',
        'matching',
        'word_bank'
    ];

    // Auto-generate unique IDs (random, no auto-merge - users must provide matching IDs for merging)
    let idCounter = 0;
    const generateId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;

    const validateQuestion = (q: unknown, questionIndex: number, topicName: string, topicId: string): Question => {
        if (typeof q !== 'object' || q === null) {
            throw new Error(`Invalid question ${questionIndex + 1} in topic "${topicName}": Must be an object`);
        }

        const question = q as Record<string, unknown>;

        // Auto-generate id if not provided
        const id = typeof question.id === 'string' && question.id ? question.id : generateId('q');

        // Accept both "question" and "prompt" for the question text
        const prompt = question.prompt || question.question;

        // Validate base fields
        if (typeof question.type !== 'string' || !validQuestionTypes.includes(question.type as QuestionType)) {
            throw new Error(`Invalid question ${questionIndex + 1} in topic "${topicName}": Missing or invalid "type" (must be one of: ${validQuestionTypes.join(', ')})`);
        }
        if (typeof prompt !== 'string' || !prompt) {
            throw new Error(`Invalid question ${questionIndex + 1} in topic "${topicName}": Missing or invalid "question" or "prompt"`);
        }

        // Set the normalized values
        question.id = id;
        question.prompt = prompt;
        question.topicId = topicId; // Auto-infer from parent topic

        const type = question.type as QuestionType;

        // Validate type-specific fields
        switch (type) {
            case 'multiple_choice': {
                if (!Array.isArray(question.choices) || question.choices.length === 0) {
                    throw new Error(`Invalid multiple_choice question "${question.id}": Missing or invalid "choices" array`);
                }
                if (typeof question.answerIndex !== 'number' || question.answerIndex < 0 || question.answerIndex >= question.choices.length) {
                    throw new Error(`Invalid multiple_choice question "${question.id}": Missing or invalid "answerIndex"`);
                }
                break;
            }

            case 'multiple_answer': {
                if (!Array.isArray(question.choices) || question.choices.length === 0) {
                    throw new Error(`Invalid multiple_answer question "${question.id}": Missing or invalid "choices" array`);
                }
                if (!Array.isArray(question.answerIndices) || question.answerIndices.length === 0) {
                    throw new Error(`Invalid multiple_answer question "${question.id}": Missing or invalid "answerIndices" array`);
                }
                if (!question.answerIndices.every((idx: unknown) => typeof idx === 'number' && idx >= 0 && idx < (question.choices as unknown[]).length)) {
                    throw new Error(`Invalid multiple_answer question "${question.id}": "answerIndices" contains invalid values`);
                }
                break;
            }

            case 'true_false': {
                if (typeof question.answer !== 'boolean') {
                    throw new Error(`Invalid true_false question "${question.id}": Missing or invalid "answer"(must be boolean)`);
                }
                break;
            }

            case 'keywords': {
                if (typeof question.answer !== 'string' && !Array.isArray(question.answer)) {
                    throw new Error(`Invalid keywords question "${question.id}": Missing or invalid "answer"(must be string or array of strings)`);
                }
                if (Array.isArray(question.answer) && question.answer.length === 0) {
                    throw new Error(`Invalid keywords question "${question.id}": "answer" array cannot be empty`);
                }
                break;
            }

            case 'matching': {
                if (!Array.isArray(question.pairs) || question.pairs.length === 0) {
                    throw new Error(`Invalid matching question "${question.id}": Missing or invalid "pairs" array`);
                }
                if (!question.pairs.every((pair: unknown) =>
                    typeof pair === 'object' &&
                    pair !== null &&
                    typeof (pair as Record<string, unknown>).left === 'string' &&
                    typeof (pair as Record<string, unknown>).right === 'string'
                )) {
                    throw new Error(`Invalid matching question "${question.id}": "pairs" must be an array of objects with "left" and "right" strings`);
                }
                break;
            }

            case 'word_bank': {
                if (typeof question.sentence !== 'string' || !question.sentence) {
                    throw new Error(`Invalid word_bank question "${question.id}": Missing or invalid "sentence"`);
                }
                if (!Array.isArray(question.wordBank) || question.wordBank.length === 0) {
                    throw new Error(`Invalid word_bank question "${question.id}": Missing or invalid "wordBank" array`);
                }
                if (!Array.isArray(question.answers) || question.answers.length === 0) {
                    throw new Error(`Invalid word_bank question "${question.id}": Missing or invalid "answers" array`);
                }
                const blankCount = (question.sentence as string).split('_').length - 1;
                if (question.answers.length !== blankCount) {
                    throw new Error(`Invalid word_bank question "${question.id}": "answers" array length(${question.answers.length}) doesn't match number of blanks in sentence (${blankCount})`);
                }
                break;
            }
        }

        return question as unknown as Question;
    };

    const validateTopic = (t: unknown, topicIndex: number, subjectName: string): Topic => {
        if (typeof t !== 'object' || t === null) {
            throw new Error(`Invalid topic ${topicIndex + 1} in subject "${subjectName}": Must be an object`);
        }

        const topic = t as Record<string, unknown>;

        if (typeof topic.name !== 'string' || !topic.name) {
            throw new Error(`Invalid topic ${topicIndex + 1} in subject "${subjectName}": Missing or invalid "name"`);
        }

        // Use provided ID, or generate unique random ID
        const id = typeof topic.id === 'string' && topic.id ? topic.id : generateId('topic');

        if (!Array.isArray(topic.questions)) {
            throw new Error(`Invalid topic "${topic.name}": Missing or invalid "questions" array`);
        }

        const questions = topic.questions.map((q, idx) => validateQuestion(q, idx, topic.name as string, id));

        return {
            id,
            name: topic.name as string,
            questions
        };
    };

    const validateSubject = (s: unknown, subjectIndex: number): Subject => {
        if (typeof s !== 'object' || s === null) {
            throw new Error(`Invalid subject ${subjectIndex + 1}: Must be an object`);
        }

        const subject = s as Record<string, unknown>;

        if (typeof subject.name !== 'string' || !subject.name) {
            throw new Error(`Invalid subject ${subjectIndex + 1}: Missing or invalid "name"`);
        }

        // Use provided ID, or generate unique random ID
        const id = typeof subject.id === 'string' && subject.id ? subject.id : generateId('subject');

        if (!Array.isArray(subject.topics)) {
            throw new Error(`Invalid subject "${subject.name}": Missing or invalid "topics" array`);
        }

        const topics = subject.topics.map((t, idx) => validateTopic(t, idx, subject.name as string));

        return {
            id,
            name: subject.name as string,
            topics
        };
    };

    return subjectsToValidate.map((s, idx) => validateSubject(s, idx));
};

/** Extract all media references with context (subject/topic names) */
export const extractMediaReferencesWithContext = (data: unknown): MediaReference[] => {
    const mediaRefs: MediaReference[] = [];

    const processQuestion = (q: Record<string, unknown>, subjectName: string, topicName: string) => {
        if (typeof q.media === 'string' && q.media) {
            mediaRefs.push({
                path: q.media,
                filename: getFilename(q.media),
                subjectName,
                topicName
            });
        }
    };

    const processSubjects = (subjects: unknown[]) => {
        for (const subject of subjects) {
            if (typeof subject === 'object' && subject !== null) {
                const s = subject as Record<string, unknown>;
                const subjectName = typeof s.name === 'string' ? s.name : 'Unknown Subject';
                if (Array.isArray(s.topics)) {
                    for (const topic of s.topics) {
                        if (typeof topic === 'object' && topic !== null) {
                            const t = topic as Record<string, unknown>;
                            const topicName = typeof t.name === 'string' ? t.name : 'Unknown Topic';
                            if (Array.isArray(t.questions)) {
                                for (const q of t.questions) {
                                    if (typeof q === 'object' && q !== null) {
                                        processQuestion(q as Record<string, unknown>, subjectName, topicName);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    if (Array.isArray(data)) {
        processSubjects(data);
    } else if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>;
        if (obj.requizleSubjectExport === 1 && typeof obj.subject === 'object' && obj.subject !== null) {
            processSubjects([obj.subject]);
        } else if (Array.isArray(obj.subjects)) {
            // It's a profile
            processSubjects(obj.subjects);
        } else if (obj.topics) {
            // It's a single subject
            processSubjects([obj]);
        }
    }

    return mediaRefs;
};

/** Get local media references (filter out remote URLs and stored media) */
export const getLocalMediaRefs = (refs: MediaReference[]): MediaReference[] => {
    return refs.filter(r => !isRemoteOrStoredMedia(r.path));
};

/** Group media by filename and detect conflicts */
export const groupMediaByFilename = (refs: MediaReference[]): MediaGroup[] => {
    const groups = new Map<string, MediaReference[]>();

    for (const ref of refs) {
        const existing = groups.get(ref.filename) || [];
        existing.push(ref);
        groups.set(ref.filename, existing);
    }

    return Array.from(groups.entries()).map(([filename, references]) => {
        // Check if this is a conflict: same filename but different paths
        const uniquePaths = new Set(references.map(r => r.path));
        const isConflict = uniquePaths.size > 1;

        return {
            filename,
            references,
            isConflict,
            uploaded: false,
            uploadedDataUri: undefined
        };
    });
};

/** Replace media paths with new references (for conflict-aware replacement) */
export const replaceMediaByPath = (data: unknown, mediaMap: Map<string, string>): unknown => {
    if (Array.isArray(data)) {
        return data.map(item => replaceMediaByPath(item, mediaMap));
    }
    if (typeof data === 'object' && data !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            if (key === 'media' && typeof value === 'string') {
                // Try full path first, then filename
                result[key] = mediaMap.get(value) || mediaMap.get(getFilename(value)) || value;
            } else {
                result[key] = replaceMediaByPath(value, mediaMap);
            }
        }
        return result;
    }
    return data;
};
