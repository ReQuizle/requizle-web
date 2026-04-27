import type {Question, QuestionProgress, Subject, StudyMode} from '../types';
import {shuffleArray} from './array';

export const calculateMastery = (
    questions: Question[],
    progressMap: Record<string, QuestionProgress>
): number => {
    if (questions.length === 0) return 0;
    const masteredCount = questions.filter(q => progressMap[q.id]?.mastered).length;
    return Math.round((masteredCount / questions.length) * 100);
};

export const getActiveQuestions = (
    subject: Subject | null | undefined,
    selectedTopicIds: string[]
): Question[] => {
    if (!subject) return [];

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

    const queue = [...candidates];

    if (mode === 'random') {
        return shuffleArray(queue).map(q => q.id);
    }

    return queue.map(q => q.id);
};

/** Clamps re-queue gap bounds, swaps when min exceeds max, caps at 0-100. */
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

/** Insert offset for re-queuing after wrong/skip: random in [minGap, maxGap], capped to queue length. */
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
            if (!Array.isArray(userAnswer)) return false;
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
            if (!userAnswer || typeof userAnswer !== 'object') return false;
            const answers = userAnswer as Record<string, string>;
            return question.pairs.every(pair => answers[pair.left] === pair.right);
        }

        case 'word_bank': {
            if (!Array.isArray(userAnswer)) return false;
            if (userAnswer.length !== question.answers.length) return false;
            return userAnswer.every((word, index) => word === question.answers[index]);
        }

        default:
            return false;
    }
};
