import type {Question, QuestionProgress, Subject, StudyMode} from '../types';
import {shuffleArray} from './array';

export const calculateMastery = (questions: Question[], progressMap: Record<string, QuestionProgress>): number => {
    if (questions.length === 0) return 0;
    const masteredCount = questions.filter((q) => progressMap[q.id]?.mastered).length;
    return Math.round((masteredCount / questions.length) * 100);
};

export const getActiveQuestions = (subject: Subject, selectedTopicIds: string[]): Question[] => {
    const effectiveTopicIds = selectedTopicIds.length > 0 ? selectedTopicIds : subject.topics.map((t) => t.id);

    return subject.topics.filter((t) => effectiveTopicIds.includes(t.id)).flatMap((t) => t.questions);
};

export const generateQueue = (
    questions: Question[],
    progressMap: Record<string, QuestionProgress>,
    mode: StudyMode,
    includeMastered: boolean
): string[] => {
    const candidates = includeMastered ? questions : questions.filter((q) => !progressMap[q.id]?.mastered);
    return (mode === 'random' ? shuffleArray(candidates) : candidates).map((q) => q.id);
};

/** Rounds the requeue gap bounds to whole numbers from 0 to 100, swapping them when min exceeds max. */
export const normalizeRequeueGapRange = (minGap: number, maxGap: number): {min: number; max: number} => {
    const clamp = (gap: number) => Math.max(0, Math.min(100, Math.round(gap)));
    const [min, max] = [clamp(minGap), clamp(maxGap)].sort((a, b) => a - b);
    return {min, max};
};

/** Insert offset for requeuing after wrong/skip: random in [minGap, maxGap], capped to queue length. */
export const randomRequeueInsertIndex = (queueLength: number, minGap: number, maxGap: number): number => {
    const offset = minGap + Math.floor(Math.random() * (maxGap - minGap + 1));
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
            return (
                sortedUser.length === sortedCorrect.length &&
                sortedUser.every((val, index) => val === sortedCorrect[index])
            );
        }

        case 'true_false':
            return userAnswer === question.answer;

        case 'keywords': {
            const answers = Array.isArray(question.answer) ? question.answer : [question.answer];
            const normalize = (text: string) => (question.caseSensitive ? text.trim() : text.trim().toLowerCase());
            const input = normalize(String(userAnswer));
            return answers.some((answer) => normalize(answer) === input);
        }

        case 'matching': {
            if (!userAnswer || typeof userAnswer !== 'object') return false;
            const answers = userAnswer as Record<string, string>;
            return question.pairs.every((pair) => answers[pair.left] === pair.right);
        }

        case 'word_bank': {
            if (!Array.isArray(userAnswer)) return false;
            if (userAnswer.length !== question.answers.length) return false;
            return userAnswer.every((word, index) => word === question.answers[index]);
        }
    }
};
