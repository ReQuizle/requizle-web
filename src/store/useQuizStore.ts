import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import type {Subject, StudyMode, Profile, SubjectExportV1, Question} from '../types';
import {validateProfileImport} from '../utils/importValidation';
import {normalizeRequeueGapRange} from '../utils/quizLogic';
import {indexedDBStorage} from '../utils/indexedDBStorage';
import {createProfileSettingsActions} from './profileSettingsActions';
import {createQuizCoreActions} from './quizCoreActions';
import {createDefaultProfile, DEFAULT_PROFILE_ID, DEFAULT_SESSION_STATE, DEFAULT_SETTINGS} from './defaults';
import {isRecord} from '../utils/typeGuards';
import {isColorThemeId, LEGACY_COLOR_THEME_MAP, sanitizeCustomAccentHex, type ColorThemeId} from '../utils/colorThemes';

export interface Settings {
    confirmSubjectDelete: boolean;
    confirmProfileDelete: boolean;
    /** If false, subject progress reset runs without a confirm dialog. */
    confirmResetSubjectProgress: boolean;
    /** If false, topic progress reset runs without a confirm dialog. */
    confirmResetTopicProgress: boolean;
    /** If false, incorrect answers advance only; question is not requeued. */
    quizRequeueOnIncorrect: boolean;
    /** If false, skipped questions are not requeued. */
    quizRequeueOnSkip: boolean;
    /** Min positions ahead to reinsert a requeued question (inclusive, 0 = front). */
    quizRequeueGapMin: number;
    /** Max positions ahead to reinsert (inclusive). */
    quizRequeueGapMax: number;
    animatedBackground: boolean;
    colorTheme: ColorThemeId;
    customAccentColor: string;
    /** Set after bundled sample content is added on first run. */
    sampleDataSeeded: boolean;
    /** Quiz feedback tones (correct / wrong / skip / continue). */
    soundEnabled: boolean;
}

export type AnswerResult = {correct: boolean; explanation?: string};

export interface QuizState {
    profiles: Record<string, Profile>;
    activeProfileId: string;
    settings: Settings;

    // Actions
    setSubjects: (subjects: Subject[]) => void;
    importSubjects: (newSubjects: Subject[]) => void;
    deleteSubject: (subjectId: string) => void;

    startSession: (subjectId: string) => void;
    toggleTopic: (topicId: string) => void;
    selectAllTopics: () => void;
    setMode: (mode: StudyMode) => void;
    setIncludeMastered: (include: boolean) => void;
    restartQueue: () => void;

    submitAnswer: (answer: unknown) => AnswerResult;
    skipQuestion: () => void;
    nextQuestion: () => void;

    resetSubjectProgress: (subjectId: string) => void;
    importSubjectExport: (bundle: SubjectExportV1) => void;
    resetTopicProgress: (subjectId: string, topicId: string) => void;
    markTopicMastered: (subjectId: string, topicId: string) => void;

    createSubject: (name: string) => string;
    renameSubject: (subjectId: string, name: string) => void;
    addTopic: (subjectId: string, name: string) => string;
    renameTopic: (subjectId: string, topicId: string, name: string) => void;
    deleteTopic: (subjectId: string, topicId: string) => void;
    addQuestion: (subjectId: string, topicId: string, question: Question) => void;
    updateQuestion: (subjectId: string, topicId: string, question: Question) => void;
    deleteQuestion: (subjectId: string, topicId: string, questionId: string) => void;

    // Profile Actions
    createProfile: (name: string) => void;
    renameProfile: (id: string, newName: string) => void;
    switchProfile: (id: string) => void;
    deleteProfile: (id: string) => void;
    importProfile: (profile: Profile) => void;
    resetAllData: () => Promise<void>;

    // Settings Actions
    setConfirmSubjectDelete: (confirm: boolean) => void;
    setConfirmProfileDelete: (confirm: boolean) => void;
    setConfirmResetSubjectProgress: (confirm: boolean) => void;
    setConfirmResetTopicProgress: (confirm: boolean) => void;
    setQuizRequeueOnIncorrect: (value: boolean) => void;
    setQuizRequeueOnSkip: (value: boolean) => void;
    setQuizRequeueGaps: (minGap: number, maxGap: number) => void;
    setAnimatedBackground: (value: boolean) => void;
    setColorTheme: (value: ColorThemeId) => void;
    setCustomAccentColor: (value: string) => void;
    markSampleDataSeeded: () => void;
    setSoundEnabled: (value: boolean) => void;
}

type PersistedQuizSlice = Pick<QuizState, 'profiles' | 'activeProfileId' | 'settings'>;

function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function sanitizeNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' ? value : fallback;
}

function sanitizeColorTheme(value: unknown): ColorThemeId {
    if (typeof value === 'string' && value in LEGACY_COLOR_THEME_MAP) {
        return LEGACY_COLOR_THEME_MAP[value];
    }
    return isColorThemeId(value) ? value : DEFAULT_SETTINGS.colorTheme;
}

function sanitizeSettings(input: unknown, sampleDataSeededFallback: boolean): Settings {
    const raw = isRecord(input) ? input : {};
    const {min, max} = normalizeRequeueGapRange(
        sanitizeNumber(raw.quizRequeueGapMin, DEFAULT_SETTINGS.quizRequeueGapMin),
        sanitizeNumber(raw.quizRequeueGapMax, DEFAULT_SETTINGS.quizRequeueGapMax)
    );

    return {
        confirmSubjectDelete: sanitizeBoolean(raw.confirmSubjectDelete, DEFAULT_SETTINGS.confirmSubjectDelete),
        confirmProfileDelete: sanitizeBoolean(raw.confirmProfileDelete, DEFAULT_SETTINGS.confirmProfileDelete),
        confirmResetSubjectProgress: sanitizeBoolean(
            raw.confirmResetSubjectProgress,
            DEFAULT_SETTINGS.confirmResetSubjectProgress
        ),
        confirmResetTopicProgress: sanitizeBoolean(
            raw.confirmResetTopicProgress,
            DEFAULT_SETTINGS.confirmResetTopicProgress
        ),
        quizRequeueOnIncorrect: sanitizeBoolean(raw.quizRequeueOnIncorrect, DEFAULT_SETTINGS.quizRequeueOnIncorrect),
        quizRequeueOnSkip: sanitizeBoolean(raw.quizRequeueOnSkip, DEFAULT_SETTINGS.quizRequeueOnSkip),
        quizRequeueGapMin: min,
        quizRequeueGapMax: max,
        animatedBackground: sanitizeBoolean(raw.animatedBackground, DEFAULT_SETTINGS.animatedBackground),
        colorTheme: sanitizeColorTheme(raw.colorTheme),
        customAccentColor: sanitizeCustomAccentHex(raw.customAccentColor, DEFAULT_SETTINGS.customAccentColor),
        sampleDataSeeded: sanitizeBoolean(raw.sampleDataSeeded, sampleDataSeededFallback),
        soundEnabled: sanitizeBoolean(raw.soundEnabled, DEFAULT_SETTINGS.soundEnabled)
    };
}

export function sanitizePersistedQuizState(persistedState: unknown): PersistedQuizSlice {
    const hasPersistedState = isRecord(persistedState);
    const input = hasPersistedState ? persistedState : {};
    const profiles: Record<string, Profile> = {};

    if (isRecord(input.profiles)) {
        for (const [profileId, profile] of Object.entries(input.profiles)) {
            try {
                const profileInput =
                    isRecord(profile) && typeof profile.id === 'string'
                        ? profile
                        : {...(isRecord(profile) ? profile : {}), id: profileId};
                const validated = validateProfileImport(profileInput);
                profiles[validated.id] = validated;
            } catch {
                // Skips invalid profile JSON so the rest of persisted state can load.
                console.warn(`Dropping corrupt persisted profile "${profileId}" during hydration.`);
            }
        }
    }

    if (Object.keys(profiles).length === 0) {
        profiles[DEFAULT_PROFILE_ID] = createDefaultProfile();
    }

    const activeProfileId =
        typeof input.activeProfileId === 'string' && profiles[input.activeProfileId]
            ? input.activeProfileId
            : Object.values(profiles).sort((a, b) => b.createdAt - a.createdAt)[0].id;

    return {
        profiles,
        activeProfileId,
        settings: sanitizeSettings(input.settings, hasPersistedState)
    };
}

export const useQuizStore = create<QuizState>()(
    persist(
        (set, get) => ({
            profiles: {
                [DEFAULT_PROFILE_ID]: createDefaultProfile()
            },
            activeProfileId: DEFAULT_PROFILE_ID,
            settings: {...DEFAULT_SETTINGS},
            ...createQuizCoreActions(set, get),
            ...createProfileSettingsActions(set, get)
        }),
        {
            name: 'quiz-storage',
            version: 1,
            // IndexedDB avoids localStorage size limits for large state JSON.
            storage: createJSONStorage(() => indexedDBStorage),
            migrate: (persistedState: unknown, version: number) => {
                if (version === 0) {
                    const oldState = isRecord(persistedState) ? persistedState : {};
                    // v0: flat { subjects, progress, session } -> v1: profiles + activeProfileId
                    const defaultProfile: Profile = {
                        id: DEFAULT_PROFILE_ID,
                        name: 'Default',
                        subjects: Array.isArray(oldState.subjects) ? (oldState.subjects as Subject[]) : [],
                        progress: isRecord(oldState.progress) ? (oldState.progress as Profile['progress']) : {},
                        session: {
                            ...DEFAULT_SESSION_STATE,
                            ...(isRecord(oldState.session) ? oldState.session : {})
                        },
                        createdAt: Date.now()
                    };

                    return {
                        profiles: {[DEFAULT_PROFILE_ID]: defaultProfile},
                        activeProfileId: DEFAULT_PROFILE_ID,
                        settings: {
                            ...DEFAULT_SETTINGS,
                            sampleDataSeeded: true
                        }
                    };
                }

                return persistedState;
            },
            merge: (persistedState, currentState) => {
                const sanitized = sanitizePersistedQuizState(persistedState);
                return {
                    ...currentState,
                    ...sanitized
                };
            }
        }
    )
);
