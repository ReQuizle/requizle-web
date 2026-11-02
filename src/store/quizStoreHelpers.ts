import type {Profile, ProgressMap, Question, QuestionProgress, SessionState, Subject} from '../types';
import {sanitizeSubjectProgress} from '../utils/importValidation';
import {generateQueue, getActiveQuestions} from '../utils/quizLogic';
import {deleteMedia, extractMediaId, isIndexedDBMedia} from '../utils/mediaStorage';
import type {QuizState} from './useQuizStore';

export type SetQuizState = (
    partial: QuizState | Partial<QuizState> | ((state: QuizState) => QuizState | Partial<QuizState>)
) => void;

/** Topic id to question id to progress, for one subject */
type SubjectProgress = ProgressMap[string];

export const getCurrentProfile = (state: QuizState) => state.profiles[state.activeProfileId];

export const getCurrentSubject = (state: QuizState) => {
    const profile = getCurrentProfile(state);
    if (!profile) return undefined;
    return profile.subjects.find((s) => s.id === profile.session.subjectId);
};

export function flattenProgress(subjectProgress: SubjectProgress | undefined): Record<string, QuestionProgress> {
    if (!subjectProgress) return {};
    const flat: Record<string, QuestionProgress> = {};
    Object.values(subjectProgress).forEach((topicProgress) => {
        Object.assign(flat, topicProgress);
    });
    return flat;
}

/** Combine two progress records for a subject; entries in `incoming` win. */
export function mergeSubjectProgress(existing: SubjectProgress, incoming: SubjectProgress): SubjectProgress {
    const merged = {...existing};
    for (const [topicId, topicProgress] of Object.entries(incoming)) {
        merged[topicId] = {...merged[topicId], ...topicProgress};
    }
    return merged;
}

/** The session with a new queue for the subject; the first question in it is shown now. */
export function withFreshQueue(
    session: SessionState,
    subject: Subject,
    subjectProgress: SubjectProgress | undefined
): SessionState {
    const queue = generateQueue(
        getActiveQuestions(subject, session.selectedTopicIds),
        flattenProgress(subjectProgress),
        session.mode,
        session.includeMastered
    );
    return {...session, queue: queue.slice(1), currentQuestionId: queue[0] ?? null};
}

/** The session with no subject open. */
export function endSession(session: SessionState): SessionState {
    return {...session, subjectId: null, selectedTopicIds: [], queue: [], currentQuestionId: null};
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

    const activeSubject = subjects.find((subject) => subject.id === profile.session.subjectId);
    if (!activeSubject) {
        return {progress, session: endSession(profile.session)};
    }

    const validTopicIds = new Set(activeSubject.topics.map((topic) => topic.id));
    const selectedTopicIds = profile.session.selectedTopicIds.filter((topicId) => validTopicIds.has(topicId));
    const activeQuestions = getActiveQuestions(activeSubject, selectedTopicIds);
    const validQuestionIds = new Set(activeQuestions.map((question) => question.id));

    let currentQuestionId =
        profile.session.currentQuestionId && validQuestionIds.has(profile.session.currentQuestionId)
            ? profile.session.currentQuestionId
            : null;
    const queue = profile.session.queue.filter(
        (questionId) => validQuestionIds.has(questionId) && questionId !== currentQuestionId
    );

    if (!currentQuestionId && queue.length > 0) {
        currentQuestionId = queue.shift() ?? null;
    }

    if (!currentQuestionId) {
        return {
            progress,
            session: withFreshQueue({...profile.session, selectedTopicIds}, activeSubject, progress[activeSubject.id])
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

/** `existing` with each incoming item merged into the one with the same id, or added at the end. */
function mergeById<T extends {id: string}>(existing: T[], incoming: T[], merge: (current: T, next: T) => T): T[] {
    const merged = [...existing];
    for (const item of incoming) {
        const index = merged.findIndex((current) => current.id === item.id);
        if (index === -1) {
            merged.push(item);
        } else {
            merged[index] = merge(merged[index], item);
        }
    }
    return merged;
}

/**
 * The subjects with the incoming ones merged in by id. Matching subjects and topics keep their
 * other topics and questions, and an incoming question replaces the one with its id.
 */
export function mergeSubjectsIntoList(existing: Subject[], incoming: Subject[]): Subject[] {
    return mergeById(existing, incoming, (subject, newSubject) => ({
        ...subject,
        ...newSubject,
        topics: mergeById(subject.topics, newSubject.topics, (topic, newTopic) => ({
            ...topic,
            ...newTopic,
            questions: mergeById(topic.questions, newTopic.questions, (_, newQuestion) => newQuestion)
        }))
    }));
}

/** The profile's session, with a new queue when `subjectId` is the subject being studied. */
export function rebuildSessionForSubjectIfActive(
    profile: Profile,
    subjectId: string,
    subjects: Subject[],
    subjectProgress: SubjectProgress | undefined
): SessionState {
    if (profile.session.subjectId !== subjectId) {
        return profile.session;
    }
    const subject = subjects.find((s) => s.id === subjectId);
    return subject ? withFreshQueue(profile.session, subject, subjectProgress) : profile.session;
}

export function questionsIn(subjects: Subject[]): Question[] {
    return subjects.flatMap((subject) => subject.topics.flatMap((topic) => topic.questions));
}

/** The ids of the stored media these questions show */
export function mediaIdsIn(questions: Question[]): Set<string> {
    const mediaIds = new Set<string>();
    for (const {media} of questions) {
        if (media && isIndexedDBMedia(media)) mediaIds.add(extractMediaId(media));
    }
    return mediaIds;
}

/** The ids of the stored media used anywhere in these profiles */
export function mediaIdsInProfiles(profiles: Record<string, Profile>): Set<string> {
    return mediaIdsIn(Object.values(profiles).flatMap((profile) => questionsIn(profile.subjects)));
}

/** Deletes the media in `mediaToCheck` that no profile uses any more. */
export function cleanupOrphanedMedia(mediaToCheck: Set<string>, getState: () => QuizState): void {
    if (mediaToCheck.size === 0) return;
    const stillInUse = mediaIdsInProfiles(getState().profiles);
    for (const mediaId of mediaToCheck) {
        if (!stillInUse.has(mediaId)) {
            deleteMedia(mediaId).catch((err) => {
                console.error(`Failed to delete orphaned media ${mediaId}:`, err);
            });
        }
    }
}
