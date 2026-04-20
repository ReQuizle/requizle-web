import type {Question, QuestionProgress, Subject, StudyMode} from '../types';

export const calculateMastery = (
    questions: Question[],
    progressMap: Record<string, QuestionProgress>
): number => {
    if (questions.length === 0) return 0;
    const masteredCount = questions.filter(q => progressMap[q.id]?.mastered).length;
    return Math.round((masteredCount / questions.length) * 100);
};

export const getActiveQuestions = (
    subject: Subject,
    selectedTopicIds: string[]
): Question[] => {
    if (!subject) return [];

    // If no topics selected, all are active
    const effectiveTopicIds = selectedTopicIds.length > 0
        ? selectedTopicIds
        : subject.topics.map(t => t.id);

    return subject.topics
        .filter(t => effectiveTopicIds.includes(t.id))
        .flatMap(t => t.questions);
};

export const generateQueue = (
    questions: Question[],
    progressMap: Record<string, QuestionProgress>,
    mode: StudyMode,
    includeMastered: boolean
): string[] => {
    let candidates = questions;

    if (!includeMastered) {
        candidates = candidates.filter(q => !progressMap[q.id]?.mastered);
    }

    if (candidates.length === 0) return [];

    // Create a shallow copy to sort/shuffle
    const queue = [...candidates];

    if (mode === 'random') {
        // Fisher-Yates shuffle
        for (let i = queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue[i], queue[j]] = [queue[j], queue[i]];
        }
    } else {
        // Topic order is preserved by default if we just flatMap topics in order
        // But we need to ensure 'questions' passed in is already in topic order
        // The getActiveQuestions function preserves topic order
    }

    return queue.map(q => q.id);
};

/** Clamp and order requeue gap bounds for “N positions ahead” in the queue (0 = front). */
export const normalizeRequeueGapRange = (minGap: number, maxGap: number): {min: number; max: number} => {
    let min = Number.isFinite(minGap) ? Math.round(minGap) : 4;
    let max = Number.isFinite(maxGap) ? Math.round(maxGap) : 6;
    min = Math.max(0, Math.min(100, min));
    max = Math.max(0, Math.min(100, max));
    if (min > max) {
        [min, max] = [max, min];
    }
    return {min, max};
};

/**
 * Random insert index for re-queuing the current question after a wrong answer or skip.
 * Matches previous behavior: pick offset in [minGap, maxGap], then cap at queue length.
 */
export const randomRequeueInsertIndex = (queueLength: number, minGap: number, maxGap: number): number => {
    const {min, max} = normalizeRequeueGapRange(minGap, maxGap);
    const span = max - min + 1;
    const offset = min + Math.floor(Math.random() * span);
    return Math.min(offset, queueLength);
};

export const checkAnswer = (question: Question, userAnswer: unknown): boolean => {
    switch (question.type) {
        case 'multiple_choice':
            return userAnswer === question.answerIndex;

        case 'multiple_answer': {
            // userAnswer is number[] (indices)
            if (!Array.isArray(userAnswer)) return false;
            // Check if lengths match and all selected indices are correct
            // Sort both to ensure order doesn't matter
            const sortedUser = [...userAnswer].sort((a, b) => a - b);
            const sortedCorrect = [...question.answerIndices].sort((a, b) => a - b);
            return sortedUser.length === sortedCorrect.length &&
                sortedUser.every((val, index) => val === sortedCorrect[index]);
        }

        case 'true_false':
            return userAnswer === question.answer;

        case 'keywords': {
            const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
            const input = String(userAnswer).trim();

            if (question.caseSensitive) {
                return answers.some(a => a.trim() === input);
            } else {
                return answers.some(a => a.trim().toLowerCase() === input.toLowerCase());
            }
        }

        case 'matching': {
            // userAnswer is Record<left, right>
            if (!userAnswer || typeof userAnswer !== 'object') return false;
            const answers = userAnswer as Record<string, string>;
            return question.pairs.every(pair => answers[pair.left] === pair.right);
        }

        case 'word_bank': {
            // userAnswer is string[] (filled slots in order)
            if (!Array.isArray(userAnswer)) return false;
            if (userAnswer.length !== question.answers.length) return false;
            return userAnswer.every((word, index) => word === question.answers[index]);
        }

        default:
            return false;
    }
};
