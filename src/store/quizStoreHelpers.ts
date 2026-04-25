import type {Profile, Question, QuestionProgress, SessionState, Subject, Topic} from '../types';
import {sanitizeSubjectProgress} from '../utils/importValidation';
import {generateQueue, getActiveQuestions} from '../utils/quizLogic';
import {deleteMedia, extractMediaId, isIndexedDBMedia} from '../utils/mediaStorage';
import type {QuizState} from './useQuizStore';

export const getCurrentProfile = (state: QuizState) => state.profiles[state.activeProfileId];

export const getCurrentSubject = (state: QuizState) => {
    const profile = getCurrentProfile(state);
    if (!profile) return undefined;
    return profile.subjects.find(s => s.id === profile.session.subjectId);
};

export function flattenProgress(
    subjectProgress: Record<string, Record<string, QuestionProgress>> | undefined
): Record<string, QuestionProgress> {
    if (!subjectProgress) return {};
    const flat: Record<string, QuestionProgress> = {};
    Object.values(subjectProgress).forEach(topicProgress => {
        Object.assign(flat, topicProgress);
    });
    return flat;
}

export function reconcileProfileStateForSubjects(
    profile: Profile,
    subjects: Subject[]
): Pick<Profile, 'progress' | 'session'> {
    const progress: Profile['progress'] = {};
    for (const subject of subjects) {
        const sanitizedSubjectProgress = sanitizeSubjectProgress(profile.progress[subject.id], subject);
        if (Object.keys(sanitizedSubjectProgress).length > 0) {
            progress[subject.id] = sanitizedSubjectProgress;
        }
    }

    if (!profile.session.subjectId) {
        return {progress, session: profile.session};
    }

    const activeSubject = subjects.find(subject => subject.id === profile.session.subjectId);
    if (!activeSubject) {
        return {
            progress,
            session: {
                ...profile.session,
                subjectId: null,
                selectedTopicIds: [],
                queue: [],
                currentQuestionId: null
            }
        };
    }

    const validTopicIds = new Set(activeSubject.topics.map(topic => topic.id));
    const selectedTopicIds = profile.session.selectedTopicIds.filter(topicId => validTopicIds.has(topicId));
    const activeQuestions = getActiveQuestions(activeSubject, selectedTopicIds);
    const validQuestionIds = new Set(activeQuestions.map(question => question.id));

    let currentQuestionId =
        profile.session.currentQuestionId && validQuestionIds.has(profile.session.currentQuestionId)
            ? profile.session.currentQuestionId
            : null;
    const queue = profile.session.queue.filter(questionId =>
        validQuestionIds.has(questionId) && questionId !== currentQuestionId
    );

    if (!currentQuestionId && queue.length > 0) {
        currentQuestionId = queue.shift() ?? null;
    }

    if (!currentQuestionId) {
        const regeneratedQueue = generateQueue(
            activeQuestions,
            flattenProgress(progress[activeSubject.id]),
            profile.session.mode,
            profile.session.includeMastered
        );
        currentQuestionId = regeneratedQueue[0] ?? null;
        return {
            progress,
            session: {
                ...profile.session,
                selectedTopicIds,
                queue: regeneratedQueue.slice(1),
                currentQuestionId
            }
        };
    }

    return {
        progress,
        session: {
            ...profile.session,
            selectedTopicIds,
            queue,
            currentQuestionId
        }
    };
}

export function mergeSubjectsIntoList(existing: Subject[], incoming: Subject[]): Subject[] {
    const mergedSubjects = [...existing];

    for (const newSubject of incoming) {
        const existingIndex = mergedSubjects.findIndex(s => s.id === newSubject.id);

        if (existingIndex === -1) {
            mergedSubjects.push(newSubject);
        } else {
            const existingSubject = mergedSubjects[existingIndex];
            const mergedTopics = [...existingSubject.topics];

            for (const newTopic of newSubject.topics) {
                const existingTopicIndex = mergedTopics.findIndex(t => t.id === newTopic.id);

                if (existingTopicIndex === -1) {
                    mergedTopics.push(newTopic);
                } else {
                    const existingTopic = mergedTopics[existingTopicIndex];
                    const mergedQuestions = [...existingTopic.questions];

                    for (const newQuestion of newTopic.questions) {
                        const existingQuestionIndex = mergedQuestions.findIndex(q => q.id === newQuestion.id);

                        if (existingQuestionIndex === -1) {
                            mergedQuestions.push(newQuestion);
                        } else {
                            mergedQuestions[existingQuestionIndex] = newQuestion;
                        }
                    }

                    mergedTopics[existingTopicIndex] = {
                        ...existingTopic,
                        ...newTopic,
                        questions: mergedQuestions
                    };
                }
            }

            mergedSubjects[existingIndex] = {
                ...existingSubject,
                ...newSubject,
                topics: mergedTopics
            };
        }
    }

    return mergedSubjects;
}

export function rebuildSessionForSubjectIfActive(
    profile: Profile,
    subjectId: string,
    mergedSubjects: Subject[],
    subjectProgressSlice: Record<string, Record<string, QuestionProgress>> | undefined
): SessionState {
    if (profile.session.subjectId !== subjectId) {
        return profile.session;
    }
    const subject = mergedSubjects.find(s => s.id === subjectId);
    if (!subject) {
        return profile.session;
    }
    const questions = getActiveQuestions(subject, profile.session.selectedTopicIds);
    const queue = generateQueue(
        questions,
        flattenProgress(subjectProgressSlice),
        profile.session.mode,
        profile.session.includeMastered
    );
    return {
        ...profile.session,
        queue: queue.slice(1),
        currentQuestionId: queue[0] || null
    };
}

export function extractMediaIdsFromQuestion(question: Question): Set<string> {
    const mediaIds = new Set<string>();
    if (question.media && isIndexedDBMedia(question.media)) {
        mediaIds.add(extractMediaId(question.media));
    }
    return mediaIds;
}

export function extractMediaIdsFromTopic(topic: Topic): Set<string> {
    const mediaIds = new Set<string>();
    for (const q of topic.questions) {
        extractMediaIdsFromQuestion(q).forEach(id => mediaIds.add(id));
    }
    return mediaIds;
}

export function extractMediaIdsFromSubject(subject: Subject): Set<string> {
    const mediaIds = new Set<string>();
    for (const topic of subject.topics) {
        extractMediaIdsFromTopic(topic).forEach(id => mediaIds.add(id));
    }
    return mediaIds;
}

export function extractAllMediaIds(profiles: Record<string, Profile>): Set<string> {
    const allMediaIds = new Set<string>();
    for (const profile of Object.values(profiles)) {
        for (const subject of profile.subjects) {
            const subjectMediaIds = extractMediaIdsFromSubject(subject);
            subjectMediaIds.forEach(id => allMediaIds.add(id));
        }
    }
    return allMediaIds;
}

export function cleanupOrphanedMedia(
    mediaToCheck: Set<string>,
    getState: () => QuizState
): void {
    if (mediaToCheck.size === 0) return;
    const updatedState = getState();
    const stillInUse = extractAllMediaIds(updatedState.profiles);
    for (const mediaId of mediaToCheck) {
        if (!stillInUse.has(mediaId)) {
            deleteMedia(mediaId).catch(err => {
                console.error(`Failed to delete orphaned media ${mediaId}:`, err);
            });
        }
    }
}

export function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

export function sanitizeNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' ? value : fallback;
}

export function removeLocalStorageItem(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // Some privacy modes deny storage access; reset should still complete in memory.
    }
}
