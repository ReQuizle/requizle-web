import type {Profile, SessionState} from '../types';
import {DEFAULT_COLOR_THEME, DEFAULT_CUSTOM_ACCENT_HEX} from '../utils/colorThemes';
import type {Settings} from './useQuizStore';

export const DEFAULT_PROFILE_ID = 'default';

/** Default `session` when no study subject is active. */
export const DEFAULT_SESSION_STATE: SessionState = {
    subjectId: null,
    selectedTopicIds: [],
    mode: 'topic_order',
    includeMastered: false,
    queue: [],
    currentQuestionId: null,
    turnCounter: 0
};

export const DEFAULT_SETTINGS: Settings = {
    confirmSubjectDelete: true,
    confirmProfileDelete: true,
    confirmResetSubjectProgress: true,
    confirmResetTopicProgress: true,
    quizRequeueOnIncorrect: true,
    quizRequeueOnSkip: true,
    quizRequeueGapMin: 4,
    quizRequeueGapMax: 6,
    animatedBackground: true,
    colorTheme: DEFAULT_COLOR_THEME,
    customAccentColor: DEFAULT_CUSTOM_ACCENT_HEX,
    sampleDataSeeded: false,
    soundEnabled: true
};

export function createDefaultProfile(): Profile {
    return {
        id: DEFAULT_PROFILE_ID,
        name: 'Default',
        subjects: [],
        progress: {},
        session: {...DEFAULT_SESSION_STATE},
        createdAt: Date.now()
    };
}
