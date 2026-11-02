export type QuestionType = 'multiple_choice' | 'keywords' | 'true_false' | 'matching' | 'word_bank' | 'multiple_answer';

interface BaseQuestion {
    id: string;
    type: QuestionType;
    prompt: string;
    topicId: string;
    explanation?: string;
    /** An image or video: a URL, a path, or an `idb:` reference to a stored file */
    media?: string;
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

interface MatchingPair {
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
    /** The correct word for each blank, in order */
    answers: string[];
}

export interface MultipleAnswerQuestion extends BaseQuestion {
    type: 'multiple_answer';
    choices: string[];
    /** Indices of all the correct choices */
    answerIndices: number[];
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

/** Progress by subject id, then topic id, then question id */
export type ProgressMap = Record<string, Record<string, Record<string, QuestionProgress>>>;

export type StudyMode = 'random' | 'topic_order';

export interface SessionState {
    subjectId: string | null;
    selectedTopicIds: string[];
    mode: StudyMode;
    includeMastered: boolean;
    /** Question ids in the study queue. */
    queue: string[];
    currentQuestionId: string | null;
    /** Count of navigations to a new current question in this session. */
    turnCounter: number;
}

/** Single-subject export (`requizleSubjectExport: 1`). `progress` is optional. */
export interface SubjectExportV1 {
    requizleSubjectExport: 1;
    subject: Subject;
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
