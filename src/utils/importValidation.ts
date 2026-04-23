/**
 * Import validation utilities for parsing and validating JSON quiz data.
 */

import type {
    Subject,
    Question,
    QuestionType,
    Topic,
    SubjectExportV1,
    QuestionProgress,
    Profile,
    ProgressMap,
    SessionState,
    StudyMode
} from '../types';

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
    uploadedPerRef?: Map<string, string>;
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

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneJsonValue(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string');
}

function hasDuplicateStrings(values: string[]): boolean {
    const seen = new Set<string>();
    for (const value of values) {
        if (seen.has(value)) return true;
        seen.add(value);
    }
    return false;
}

function hasEnoughWordBankEntries(wordBank: string[], answers: string[]): boolean {
    const remaining = new Map<string, number>();
    for (const word of wordBank) {
        remaining.set(word, (remaining.get(word) ?? 0) + 1);
    }

    for (const answer of answers) {
        const count = remaining.get(answer) ?? 0;
        if (count <= 0) return false;
        remaining.set(answer, count - 1);
    }

    return true;
}

export const isQuestionProgress = (data: unknown): data is QuestionProgress => {
    if (!isRecord(data)) return false;
    return (
        typeof data.id === 'string' &&
        typeof data.attempts === 'number' &&
        Number.isInteger(data.attempts) &&
        data.attempts >= 0 &&
        typeof data.correctStreak === 'number' &&
        Number.isInteger(data.correctStreak) &&
        data.correctStreak >= 0 &&
        typeof data.mastered === 'boolean'
    );
};

function getSubjectQuestionIds(subject: Subject): Map<string, Set<string>> {
    const topicQuestionIds = new Map<string, Set<string>>();
    for (const topic of subject.topics) {
        topicQuestionIds.set(topic.id, new Set(topic.questions.map(q => q.id)));
    }
    return topicQuestionIds;
}

export const isValidSubjectProgressPayload = (progress: unknown, subject?: Subject): boolean => {
    if (!isRecord(progress)) return false;
    const topicQuestionIds = subject ? getSubjectQuestionIds(subject) : undefined;

    for (const [topicId, qMap] of Object.entries(progress)) {
        if (!isRecord(qMap)) return false;
        const allowedQuestionIds = topicQuestionIds?.get(topicId);
        if (topicQuestionIds && !allowedQuestionIds) return false;

        for (const [questionId, qProgress] of Object.entries(qMap)) {
            if (allowedQuestionIds && !allowedQuestionIds.has(questionId)) return false;
            if (!isQuestionProgress(qProgress)) return false;
        }
    }

    return true;
};

export const sanitizeSubjectProgress = (
    progress: unknown,
    subject?: Subject
): Record<string, Record<string, QuestionProgress>> => {
    const sanitized: Record<string, Record<string, QuestionProgress>> = {};
    if (!isRecord(progress)) return sanitized;

    const topicQuestionIds = subject ? getSubjectQuestionIds(subject) : undefined;

    for (const [topicId, qMap] of Object.entries(progress)) {
        if (!isRecord(qMap)) continue;
        const allowedQuestionIds = topicQuestionIds?.get(topicId);
        if (topicQuestionIds && !allowedQuestionIds) continue;

        const topicSlice: Record<string, QuestionProgress> = {};
        for (const [questionId, qProgress] of Object.entries(qMap)) {
            if (allowedQuestionIds && !allowedQuestionIds.has(questionId)) continue;
            if (!isQuestionProgress(qProgress)) continue;
            topicSlice[questionId] = {
                id: questionId,
                attempts: qProgress.attempts,
                correctStreak: qProgress.correctStreak,
                mastered: qProgress.mastered
            };
        }

        if (Object.keys(topicSlice).length > 0) {
            sanitized[topicId] = topicSlice;
        }
    }

    return sanitized;
};

export const isSubjectExportV1 = (data: unknown): data is SubjectExportV1 => {
    if (typeof data !== 'object' || data === null) return false;
    const o = data as Record<string, unknown>;
    let subject: Subject;
    try {
        subject = validateSubjects([cloneJsonValue(o.subject)])[0];
    } catch {
        return false;
    }
    const progressOk = o.progress === undefined || isValidSubjectProgressPayload(o.progress, subject);
    return (
        o.requizleSubjectExport === 1 &&
        typeof o.subject === 'object' &&
        o.subject !== null &&
        progressOk
    );
};

function isStudyMode(value: unknown): value is StudyMode {
    return value === 'random' || value === 'topic_order';
}

function sanitizeSessionState(session: unknown, subjects: Subject[]): SessionState {
    const input = isRecord(session) ? session : {};
    const subjectId = typeof input.subjectId === 'string' &&
        subjects.some(subject => subject.id === input.subjectId)
        ? input.subjectId
        : null;
    const subject = subjectId ? subjects.find(s => s.id === subjectId) : undefined;
    const topicIds = new Set(subject?.topics.map(t => t.id) ?? []);
    const questionIds = new Set(subject?.topics.flatMap(t => t.questions.map(q => q.id)) ?? []);

    const selectedTopicIds = Array.isArray(input.selectedTopicIds)
        ? input.selectedTopicIds.filter((id): id is string => typeof id === 'string' && topicIds.has(id))
        : [];
    const queue = Array.isArray(input.queue)
        ? input.queue.filter((id): id is string => typeof id === 'string' && questionIds.has(id))
        : [];
    const currentQuestionId = typeof input.currentQuestionId === 'string' &&
        questionIds.has(input.currentQuestionId)
        ? input.currentQuestionId
        : null;
    const turnCounter = typeof input.turnCounter === 'number' &&
        Number.isInteger(input.turnCounter) &&
        input.turnCounter >= 0
        ? input.turnCounter
        : 0;

    return {
        subjectId,
        selectedTopicIds,
        mode: isStudyMode(input.mode) ? input.mode : 'topic_order',
        includeMastered: typeof input.includeMastered === 'boolean' ? input.includeMastered : false,
        queue,
        currentQuestionId,
        turnCounter
    };
}

export const validateProfileImport = (data: unknown): Profile => {
    if (!isRecord(data)) {
        throw new Error('Invalid profile: expected an object');
    }
    if (typeof data.id !== 'string' || !data.id.trim()) {
        throw new Error('Invalid profile: missing or invalid "id"');
    }
    if (typeof data.name !== 'string' || !data.name.trim()) {
        throw new Error('Invalid profile: missing or invalid "name"');
    }
    if (!Array.isArray(data.subjects)) {
        throw new Error('Invalid profile: missing or invalid "subjects" array');
    }

    const subjects = validateSubjects(cloneJsonValue(data.subjects));
    const progressInput = isRecord(data.progress) ? data.progress : {};
    const progress: ProgressMap = {};
    for (const subject of subjects) {
        const subjectProgress = sanitizeSubjectProgress(progressInput[subject.id], subject);
        if (Object.keys(subjectProgress).length > 0) {
            progress[subject.id] = subjectProgress;
        }
    }

    const createdAt = typeof data.createdAt === 'number' && Number.isFinite(data.createdAt)
        ? data.createdAt
        : Date.now();

    return {
        id: data.id.trim(),
        name: data.name.trim(),
        subjects,
        progress,
        session: sanitizeSessionState(data.session, subjects),
        createdAt
    };
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
        const id = typeof question.id === 'string' && question.id.trim() ? question.id.trim() : generateId('q');

        // Accept both "question" and "prompt" for the question text
        const prompt = question.prompt || question.question;

        // Validate base fields
        if (typeof question.type !== 'string' || !validQuestionTypes.includes(question.type as QuestionType)) {
            throw new Error(`Invalid question ${questionIndex + 1} in topic "${topicName}": Missing or invalid "type" (must be one of: ${validQuestionTypes.join(', ')})`);
        }
        if (typeof prompt !== 'string' || !prompt.trim()) {
            throw new Error(`Invalid question ${questionIndex + 1} in topic "${topicName}": Missing or invalid "question" or "prompt"`);
        }

        // Set the normalized values
        question.id = id;
        question.prompt = prompt.trim();
        question.topicId = topicId; // Auto-infer from parent topic

        const type = question.type as QuestionType;

        // Validate type-specific fields
        switch (type) {
            case 'multiple_choice': {
                if (!isStringArray(question.choices) || question.choices.length < 2 || question.choices.some(choice => !choice.trim())) {
                    throw new Error(`Invalid multiple_choice question "${question.id}": Missing or invalid "choices" string array`);
                }
                if (typeof question.answerIndex !== 'number' || !Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex >= question.choices.length) {
                    throw new Error(`Invalid multiple_choice question "${question.id}": Missing or invalid "answerIndex"`);
                }
                break;
            }

            case 'multiple_answer': {
                if (!isStringArray(question.choices) || question.choices.length < 2 || question.choices.some(choice => !choice.trim())) {
                    throw new Error(`Invalid multiple_answer question "${question.id}": Missing or invalid "choices" string array`);
                }
                if (!Array.isArray(question.answerIndices) || question.answerIndices.length === 0) {
                    throw new Error(`Invalid multiple_answer question "${question.id}": Missing or invalid "answerIndices" array`);
                }
                if (!question.answerIndices.every((idx: unknown) => typeof idx === 'number' && Number.isInteger(idx) && idx >= 0 && idx < (question.choices as unknown[]).length)) {
                    throw new Error(`Invalid multiple_answer question "${question.id}": "answerIndices" contains invalid values`);
                }
                if (new Set(question.answerIndices).size !== question.answerIndices.length) {
                    throw new Error(`Invalid multiple_answer question "${question.id}": "answerIndices" contains duplicate values`);
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
                if (Array.isArray(question.answer) && !question.answer.every(item => typeof item === 'string')) {
                    throw new Error(`Invalid keywords question "${question.id}": "answer" array must contain strings`);
                }
                const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
                if (answers.length === 0 || answers.some(answer => !answer.trim())) {
                    throw new Error(`Invalid keywords question "${question.id}": "answer" cannot be empty`);
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
                    typeof (pair as Record<string, unknown>).right === 'string' &&
                    !!((pair as Record<string, unknown>).left as string).trim() &&
                    !!((pair as Record<string, unknown>).right as string).trim()
                )) {
                    throw new Error(`Invalid matching question "${question.id}": "pairs" must be an array of objects with "left" and "right" strings`);
                }
                const pairs = question.pairs as Array<{left: string; right: string}>;
                const leftValues = pairs.map(pair => pair.left);
                const rightValues = pairs.map(pair => pair.right);
                if (hasDuplicateStrings(leftValues) || hasDuplicateStrings(rightValues)) {
                    throw new Error(`Invalid matching question "${question.id}": "pairs" must have unique left and right values`);
                }
                break;
            }

            case 'word_bank': {
                if (typeof question.sentence !== 'string' || !question.sentence) {
                    throw new Error(`Invalid word_bank question "${question.id}": Missing or invalid "sentence"`);
                }
                if (!isStringArray(question.wordBank) || question.wordBank.some(word => !word.trim())) {
                    throw new Error(`Invalid word_bank question "${question.id}": Missing or invalid "wordBank" string array`);
                }
                if (!isStringArray(question.answers) || question.answers.some(answer => !answer.trim())) {
                    throw new Error(`Invalid word_bank question "${question.id}": Missing or invalid "answers" string array`);
                }
                const blankCount = (question.sentence as string).split('_').length - 1;
                if (blankCount === 0) {
                    throw new Error(`Invalid word_bank question "${question.id}": "sentence" must contain at least one blank`);
                }
                if (question.answers.length !== blankCount) {
                    throw new Error(`Invalid word_bank question "${question.id}": "answers" array length(${question.answers.length}) doesn't match number of blanks in sentence (${blankCount})`);
                }
                if (!hasEnoughWordBankEntries(question.wordBank as string[], question.answers as string[])) {
                    throw new Error(`Invalid word_bank question "${question.id}": each answer must exist in "wordBank"`);
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

        if (typeof topic.name !== 'string' || !topic.name.trim()) {
            throw new Error(`Invalid topic ${topicIndex + 1} in subject "${subjectName}": Missing or invalid "name"`);
        }

        // Use provided ID, or generate unique random ID
        const id = typeof topic.id === 'string' && topic.id.trim() ? topic.id.trim() : generateId('topic');

        if (!Array.isArray(topic.questions)) {
            throw new Error(`Invalid topic "${topic.name}": Missing or invalid "questions" array`);
        }

        const questions = topic.questions.map((q, idx) => validateQuestion(q, idx, topic.name as string, id));

        return {
            id,
            name: (topic.name as string).trim(),
            questions
        };
    };

    const validateSubject = (s: unknown, subjectIndex: number): Subject => {
        if (typeof s !== 'object' || s === null) {
            throw new Error(`Invalid subject ${subjectIndex + 1}: Must be an object`);
        }

        const subject = s as Record<string, unknown>;

        if (typeof subject.name !== 'string' || !subject.name.trim()) {
            throw new Error(`Invalid subject ${subjectIndex + 1}: Missing or invalid "name"`);
        }

        // Use provided ID, or generate unique random ID
        const id = typeof subject.id === 'string' && subject.id.trim() ? subject.id.trim() : generateId('subject');

        if (!Array.isArray(subject.topics)) {
            throw new Error(`Invalid subject "${subject.name}": Missing or invalid "topics" array`);
        }

        const topics = subject.topics.map((t, idx) => validateTopic(t, idx, subject.name as string));

        return {
            id,
            name: (subject.name as string).trim(),
            topics
        };
    };

    return subjectsToValidate.map((s, idx) => validateSubject(s, idx));
};

/** Check whether a payload can be imported without mutating the original data. */
export const isImportableQuizPayload = (data: unknown): boolean => {
    if (isSubjectExportV1(data)) return true;

    try {
        validateProfileImport(data);
        return true;
    } catch {
        // Try raw subject/subject-array import next.
    }

    try {
        validateSubjects(cloneJsonValue(data));
        return true;
    } catch {
        return false;
    }
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
