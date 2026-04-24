export type QuestionType =
    | 'multiple_choice'
    | 'keywords'
    | 'true_false'
    | 'matching'
    | 'word_bank'
    | 'multiple_answer';

export interface BaseQuestion {
    id: string;
    type: QuestionType;
    prompt: string;
    topicId: string;
    explanation?: string;
    media?: string; // URL/path or idb: reference for images/videos
}

export interface MultipleChoiceQuestion extends BaseQuestion {
    type: 'multiple_choice';
    choices: string[];
    answerIndex: number;
}

export interface KeywordsQuestion extends BaseQuestion {
    type: 'keywords';
    answer: string | string[];
    caseSensitive?: boolean;
}

export interface TrueFalseQuestion extends BaseQuestion {
    type: 'true_false';
    answer: boolean;
}

export interface MatchingPair {
    left: string;
    right: string;
}

export interface MatchingQuestion extends BaseQuestion {
    type: 'matching';
    pairs: MatchingPair[];
}

export interface WordBankQuestion extends BaseQuestion {
    type: 'word_bank';
    sentence: string;
    wordBank: string[];
    answers: string[]; // Correct words for each blank in order
}

export interface MultipleAnswerQuestion extends BaseQuestion {
    type: 'multiple_answer';
    choices: string[];
    answerIndices: number[]; // Indices of all correct answers
}

export type Question =
    | MultipleChoiceQuestion
    | MultipleAnswerQuestion
    | KeywordsQuestion
    | TrueFalseQuestion
    | MatchingQuestion
    | WordBankQuestion;

export interface Topic {
    id: string;
    name: string;
    questions: Question[];
}

export interface Subject {
    id: string;
    name: string;
    topics: Topic[];
}

export interface QuestionProgress {
    id: string;
    correctStreak: number;
    attempts: number;
    mastered: boolean;
}

// Map: subjectId -> topicId -> questionId -> QuestionProgress
export type ProgressMap = Record<string, Record<string, Record<string, QuestionProgress>>>;

export type StudyMode = 'random' | 'topic_order';

export interface SessionState {
    subjectId: string | null;
    selectedTopicIds: string[];
    mode: StudyMode;
    includeMastered: boolean;
    queue: string[]; // question IDs
    currentQuestionId: string | null;
    turnCounter: number; // Increments each time we advance to a new question
}

/** Single-subject backup for Import tab or left-sidebar export (optional progress + optional embedded media). */
export interface SubjectExportV1 {
    requizleSubjectExport: 1;
    subject: Subject;
    /** topicId -> questionId -> progress. Omit or leave empty to share the question set only. */
    progress?: Record<string, Record<string, QuestionProgress>>;
}

export interface Profile {
    id: string;
    name: string;
    subjects: Subject[];
    progress: ProgressMap;
    session: SessionState;
    createdAt: number;
}
