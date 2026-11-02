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
import {v4 as uuidv4} from 'uuid';
import {hasDuplicateStrings, hasEnoughWordBankEntries} from './validationHelpers';
import {isRecord} from './typeGuards';

interface MediaReference {
    path: string;
    filename: string;
    subjectName: string;
    topicName: string;
}

export interface MediaGroup {
    filename: string;
    references: MediaReference[];
    isConflict: boolean;
    uploaded: boolean;
    uploadedFile?: File;
    uploadedPerRef?: Map<string, File>;
}

const QUESTION_TYPES: QuestionType[] = [
    'multiple_choice',
    'multiple_answer',
    'keywords',
    'true_false',
    'matching',
    'word_bank'
];

export const isRemoteOrStoredMedia = (media: string): boolean =>
    ['http://', 'https://', 'data:', 'idb:'].some((prefix) => media.startsWith(prefix));

export const getFilename = (path: string): string => path.split(/[/\\]/).pop() ?? path;

function cloneJsonValue(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
}

function isFilledString(value: unknown): value is string {
    return typeof value === 'string' && value.trim() !== '';
}

/** At least one string, none of them blank */
function isFilledStringList(value: unknown): value is string[] {
    return Array.isArray(value) && value.length > 0 && value.every(isFilledString);
}

/** A whole number of zero or more */
function isCount(value: unknown): value is number {
    return Number.isInteger(value) && (value as number) >= 0;
}

function isQuestionType(value: unknown): value is QuestionType {
    return QUESTION_TYPES.includes(value as QuestionType);
}

function optionalTrimmedString(value: unknown): string | undefined {
    return isFilledString(value) ? value.trim() : undefined;
}

const isQuestionProgress = (data: unknown): data is QuestionProgress =>
    isRecord(data) &&
    typeof data.id === 'string' &&
    isCount(data.attempts) &&
    isCount(data.correctStreak) &&
    typeof data.mastered === 'boolean';

function getSubjectQuestionIds(subject: Subject): Map<string, Set<string>> {
    const topicQuestionIds = new Map<string, Set<string>>();
    for (const topic of subject.topics) {
        topicQuestionIds.set(topic.id, new Set(topic.questions.map((q) => q.id)));
    }
    return topicQuestionIds;
}

/** Whether `progress` is valid progress for `subject`, naming only its topics and questions */
const isValidSubjectProgressPayload = (progress: unknown, subject: Subject): boolean => {
    if (!isRecord(progress)) return false;
    const topicQuestionIds = getSubjectQuestionIds(subject);

    for (const [topicId, qMap] of Object.entries(progress)) {
        const allowedQuestionIds = topicQuestionIds.get(topicId);
        if (!isRecord(qMap) || !allowedQuestionIds) return false;

        for (const [questionId, qProgress] of Object.entries(qMap)) {
            if (!allowedQuestionIds.has(questionId) || !isQuestionProgress(qProgress)) return false;
        }
    }

    return true;
};

/** The valid entries of `progress` for the topics and questions `subject` has */
export const sanitizeSubjectProgress = (
    progress: unknown,
    subject: Subject
): Record<string, Record<string, QuestionProgress>> => {
    const sanitized: Record<string, Record<string, QuestionProgress>> = {};
    if (!isRecord(progress)) return sanitized;

    const topicQuestionIds = getSubjectQuestionIds(subject);

    for (const [topicId, qMap] of Object.entries(progress)) {
        const allowedQuestionIds = topicQuestionIds.get(topicId);
        if (!isRecord(qMap) || !allowedQuestionIds) continue;

        const topicSlice: Record<string, QuestionProgress> = {};
        for (const [questionId, qProgress] of Object.entries(qMap)) {
            if (!allowedQuestionIds.has(questionId) || !isQuestionProgress(qProgress)) continue;
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
    if (!isRecord(data) || data.requizleSubjectExport !== 1 || !isRecord(data.subject)) return false;
    let subject: Subject;
    try {
        [subject] = validateSubjects([data.subject]);
    } catch {
        return false;
    }
    return data.progress === undefined || isValidSubjectProgressPayload(data.progress, subject);
};

function isStudyMode(value: unknown): value is StudyMode {
    return value === 'random' || value === 'topic_order';
}

function sanitizeSessionState(session: unknown, subjects: Subject[]): SessionState {
    const input = isRecord(session) ? session : {};
    const subject = subjects.find((s) => s.id === input.subjectId);
    const topicIds = new Set(subject?.topics.map((t) => t.id) ?? []);
    const questionIds = new Set(subject?.topics.flatMap((t) => t.questions.map((q) => q.id)) ?? []);
    const knownIds = (value: unknown, known: Set<string>) =>
        Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && known.has(id)) : [];

    return {
        subjectId: subject?.id ?? null,
        selectedTopicIds: knownIds(input.selectedTopicIds, topicIds),
        mode: isStudyMode(input.mode) ? input.mode : 'topic_order',
        includeMastered: typeof input.includeMastered === 'boolean' ? input.includeMastered : false,
        queue: knownIds(input.queue, questionIds),
        currentQuestionId:
            typeof input.currentQuestionId === 'string' && questionIds.has(input.currentQuestionId)
                ? input.currentQuestionId
                : null,
        turnCounter: isCount(input.turnCounter) ? input.turnCounter : 0
    };
}

export const validateProfileImport = (data: unknown): Profile => {
    if (!isRecord(data)) {
        throw new Error('Invalid profile: expected an object');
    }
    if (!isFilledString(data.id)) {
        throw new Error('Invalid profile: missing or invalid "id"');
    }
    if (!isFilledString(data.name)) {
        throw new Error('Invalid profile: missing or invalid "name"');
    }
    if (!Array.isArray(data.subjects)) {
        throw new Error('Invalid profile: missing or invalid "subjects" array');
    }

    const subjects = validateSubjects(data.subjects);
    const progressInput = isRecord(data.progress) ? data.progress : {};
    const progress: ProgressMap = {};
    for (const subject of subjects) {
        const subjectProgress = sanitizeSubjectProgress(progressInput[subject.id], subject);
        if (Object.keys(subjectProgress).length > 0) {
            progress[subject.id] = subjectProgress;
        }
    }

    return {
        id: data.id.trim(),
        name: data.name.trim(),
        subjects,
        progress,
        session: sanitizeSessionState(data.session, subjects),
        createdAt: typeof data.createdAt === 'number' && Number.isFinite(data.createdAt) ? data.createdAt : Date.now()
    };
};

/** The trimmed id, or a new one when it is missing or blank. */
function idOrNew(value: unknown, prefix: string): string {
    return isFilledString(value) ? value.trim() : `${prefix}-${uuidv4()}`;
}

/** The first id that appears more than once, if any. */
function findDuplicateId(items: {id: string}[]): string | undefined {
    const seen = new Set<string>();
    for (const {id} of items) {
        if (seen.has(id)) return id;
        seen.add(id);
    }
    return undefined;
}

/** At least two choices, none of them blank */
function isChoiceList(value: unknown): value is string[] {
    return isFilledStringList(value) && value.length >= 2;
}

const trimAll = (values: string[]) => values.map((value) => value.trim());

function validateQuestion(input: unknown, index: number, topicName: string, topicId: string): Question {
    const position = `question ${index + 1} in topic "${topicName}"`;
    if (!isRecord(input)) {
        throw new Error(`Invalid ${position}: must be an object`);
    }
    const {type} = input;
    if (!isQuestionType(type)) {
        throw new Error(
            `Invalid ${position}: missing or invalid "type" (must be one of: ${QUESTION_TYPES.join(', ')})`
        );
    }
    const prompt = input.prompt || input.question;
    if (!isFilledString(prompt)) {
        throw new Error(`Invalid ${position}: missing or invalid "question" or "prompt"`);
    }

    const invalid = (problem: string) => new Error(`Invalid ${type} ${position}: ${problem}`);
    const explanation = optionalTrimmedString(input.explanation);
    const media = optionalTrimmedString(input.media);
    const base = {
        id: idOrNew(input.id, 'q'),
        type,
        prompt: prompt.trim(),
        topicId,
        ...(explanation ? {explanation} : {}),
        ...(media ? {media} : {})
    };

    switch (type) {
        case 'multiple_choice': {
            const {choices, answerIndex} = input;
            if (!isChoiceList(choices)) {
                throw invalid('missing or invalid "choices" (at least two, none blank)');
            }
            if (!isCount(answerIndex) || answerIndex >= choices.length) {
                throw invalid('missing or invalid "answerIndex"');
            }
            return {...base, type, choices: trimAll(choices), answerIndex};
        }

        case 'multiple_answer': {
            const {choices, answerIndices} = input;
            if (!isChoiceList(choices)) {
                throw invalid('missing or invalid "choices" (at least two, none blank)');
            }
            if (!Array.isArray(answerIndices) || answerIndices.length === 0) {
                throw invalid('missing or invalid "answerIndices" array');
            }
            if (!answerIndices.every((i) => isCount(i) && i < choices.length)) {
                throw invalid('"answerIndices" contains invalid values');
            }
            if (new Set(answerIndices).size !== answerIndices.length) {
                throw invalid('"answerIndices" contains duplicate values');
            }
            return {
                ...base,
                type,
                choices: trimAll(choices),
                answerIndices: [...(answerIndices as number[])].sort((a, b) => a - b)
            };
        }

        case 'true_false': {
            const {answer} = input;
            if (typeof answer !== 'boolean') {
                throw invalid('missing or invalid "answer" (must be true or false)');
            }
            return {...base, type, answer};
        }

        case 'keywords': {
            const {answer, caseSensitive} = input;
            if (typeof answer !== 'string' && !Array.isArray(answer)) {
                throw invalid('missing or invalid "answer" (must be a string or an array of strings)');
            }
            if (Array.isArray(answer) && !answer.every((item) => typeof item === 'string')) {
                throw invalid('"answer" array must contain strings');
            }
            const answers: string[] = Array.isArray(answer) ? answer : [answer];
            if (answers.length === 0 || !answers.every(isFilledString)) {
                throw invalid('"answer" cannot be empty');
            }
            return {
                ...base,
                type,
                answer: Array.isArray(answer) ? trimAll(answers) : answer.trim(),
                ...(typeof caseSensitive === 'boolean' ? {caseSensitive} : {})
            };
        }

        case 'matching': {
            const {pairs} = input;
            if (!Array.isArray(pairs) || pairs.length === 0) {
                throw invalid('missing or invalid "pairs" array');
            }
            if (!pairs.every((pair) => isRecord(pair) && isFilledString(pair.left) && isFilledString(pair.right))) {
                throw invalid('"pairs" must be an array of objects with "left" and "right" strings');
            }
            const validPairs = pairs as {left: string; right: string}[];
            if (
                hasDuplicateStrings(validPairs.map((pair) => pair.left)) ||
                hasDuplicateStrings(validPairs.map((pair) => pair.right))
            ) {
                throw invalid('"pairs" must have unique left and right values');
            }
            return {
                ...base,
                type,
                pairs: validPairs.map(({left, right}) => ({left: left.trim(), right: right.trim()}))
            };
        }

        case 'word_bank': {
            const {sentence, wordBank, answers} = input;
            if (!isFilledString(sentence)) {
                throw invalid('missing or invalid "sentence"');
            }
            if (!isFilledStringList(wordBank)) {
                throw invalid('missing or invalid "wordBank" string array');
            }
            if (!isFilledStringList(answers)) {
                throw invalid('missing or invalid "answers" string array');
            }
            const blankCount = sentence.split('_').length - 1;
            if (blankCount === 0) {
                throw invalid('"sentence" must contain at least one blank');
            }
            if (answers.length !== blankCount) {
                throw invalid(`"answers" has ${answers.length} entries but "sentence" has ${blankCount} blanks`);
            }
            if (!hasEnoughWordBankEntries(wordBank, answers)) {
                throw invalid('each answer must appear in "wordBank" as many times as it is used');
            }
            return {...base, type, sentence: sentence.trim(), wordBank: trimAll(wordBank), answers: trimAll(answers)};
        }
    }
}

function validateTopic(input: unknown, index: number, subjectName: string): Topic {
    const position = `topic ${index + 1} in subject "${subjectName}"`;
    if (!isRecord(input)) {
        throw new Error(`Invalid ${position}: must be an object`);
    }
    const {name, questions} = input;
    if (!isFilledString(name)) {
        throw new Error(`Invalid ${position}: missing or invalid "name"`);
    }
    const id = idOrNew(input.id, 'topic');
    if (!Array.isArray(questions)) {
        throw new Error(`Invalid topic "${name}": missing or invalid "questions" array`);
    }

    const validQuestions = questions.map((question, i) => validateQuestion(question, i, name, id));
    const duplicateId = findDuplicateId(validQuestions);
    if (duplicateId) {
        throw new Error(`Invalid topic "${name}": duplicate question id "${duplicateId}" found`);
    }
    return {id, name: name.trim(), questions: validQuestions};
}

function validateSubject(input: unknown, index: number): Subject {
    if (!isRecord(input)) {
        throw new Error(`Invalid subject ${index + 1}: must be an object`);
    }
    const {name, topics} = input;
    if (!isFilledString(name)) {
        throw new Error(`Invalid subject ${index + 1}: missing or invalid "name"`);
    }
    const id = idOrNew(input.id, 'subject');
    if (!Array.isArray(topics)) {
        throw new Error(`Invalid subject "${name}": missing or invalid "topics" array`);
    }

    const validTopics = topics.map((topic, i) => validateTopic(topic, i, name));
    const duplicateTopicId = findDuplicateId(validTopics);
    if (duplicateTopicId) {
        throw new Error(`Invalid subject "${name}": duplicate topic id "${duplicateTopicId}" found`);
    }
    const duplicateQuestionId = findDuplicateId(validTopics.flatMap((topic) => topic.questions));
    if (duplicateQuestionId) {
        throw new Error(
            `Invalid subject "${name}": duplicate question id "${duplicateQuestionId}" found across topics`
        );
    }
    return {id, name: name.trim(), topics: validTopics};
}

/**
 * Check a subject, or an array of subjects, and return clean copies. Missing ids are generated
 * and text is trimmed. Throws an Error that names the first problem found.
 */
export const validateSubjects = (data: unknown): Subject[] => {
    if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid format: expected an object or array of subjects');
    }

    const copy = cloneJsonValue(data);
    const subjects = (Array.isArray(copy) ? copy : [copy]).map((subject, i) => validateSubject(subject, i));
    const duplicateId = findDuplicateId(subjects);
    if (duplicateId) {
        throw new Error(`Invalid import: duplicate subject id "${duplicateId}" found`);
    }
    return subjects;
};

function passes(validate: () => unknown): boolean {
    try {
        validate();
        return true;
    } catch {
        return false;
    }
}

export const isImportableQuizPayload = (data: unknown): boolean =>
    isSubjectExportV1(data) || passes(() => validateProfileImport(data)) || passes(() => validateSubjects(data));

/** The subjects in an import payload, whichever of the accepted shapes it has. */
function subjectsInPayload(data: unknown): unknown[] {
    if (Array.isArray(data)) return data;
    if (!isRecord(data)) return [];
    if (data.requizleSubjectExport === 1 && isRecord(data.subject)) return [data.subject];
    if (Array.isArray(data.subjects)) return data.subjects;
    return data.topics ? [data] : [];
}

export const extractMediaReferencesWithContext = (data: unknown): MediaReference[] => {
    const mediaRefs: MediaReference[] = [];

    for (const subject of subjectsInPayload(data)) {
        if (!isRecord(subject) || !Array.isArray(subject.topics)) continue;
        const subjectName = typeof subject.name === 'string' ? subject.name : 'Unknown subject';

        for (const topic of subject.topics) {
            if (!isRecord(topic) || !Array.isArray(topic.questions)) continue;
            const topicName = typeof topic.name === 'string' ? topic.name : 'Unknown topic';

            for (const question of topic.questions) {
                if (isRecord(question) && typeof question.media === 'string' && question.media) {
                    mediaRefs.push({
                        path: question.media,
                        filename: getFilename(question.media),
                        subjectName,
                        topicName
                    });
                }
            }
        }
    }

    return mediaRefs;
};

export const getLocalMediaRefs = (refs: MediaReference[]): MediaReference[] => {
    return refs.filter((r) => !isRemoteOrStoredMedia(r.path));
};

export const groupMediaByFilename = (refs: MediaReference[]): MediaGroup[] => {
    const groups = new Map<string, MediaReference[]>();

    for (const ref of refs) {
        groups.set(ref.filename, [...(groups.get(ref.filename) ?? []), ref]);
    }

    return Array.from(groups, ([filename, references]) => ({
        filename,
        references,
        // The same file name at different paths may be different files, so each is uploaded on its own
        isConflict: new Set(references.map((r) => r.path)).size > 1,
        uploaded: false
    }));
};

export const replaceMediaByPath = (data: unknown, mediaMap: Map<string, string>): unknown => {
    if (Array.isArray(data)) {
        return data.map((item) => replaceMediaByPath(item, mediaMap));
    }
    if (isRecord(data)) {
        return Object.fromEntries(
            Object.entries(data).map(([key, value]) => [
                key,
                key === 'media' && typeof value === 'string'
                    ? (mediaMap.get(value) ?? mediaMap.get(getFilename(value)) ?? value)
                    : replaceMediaByPath(value, mediaMap)
            ])
        );
    }
    return data;
};
