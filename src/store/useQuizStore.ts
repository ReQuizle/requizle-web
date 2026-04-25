import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import type {Subject, SessionState, StudyMode, Profile, SubjectExportV1, Question} from '../types';
import {validateProfileImport} from '../utils/importValidation';
import {
    normalizeRequeueGapRange
} from '../utils/quizLogic';
import {indexedDBStorage} from '../utils/indexedDBStorage';
import {v4 as uuidv4} from 'uuid';
import {createProfileSettingsActions} from './profileSettingsActions';
import {createQuizCoreActions} from './quizCoreActions';
import {
    cleanupOrphanedMedia,
    extractMediaIdsFromQuestion,
    extractMediaIdsFromSubject,
    extractMediaIdsFromTopic,
    flattenProgress,
    getCurrentProfile,
    getCurrentSubject,
    mergeSubjectsIntoList,
    reconcileProfileStateForSubjects,
    rebuildSessionForSubjectIfActive,
    removeLocalStorageItem,
    sanitizeBoolean,
    sanitizeNumber
} from './quizStoreHelpers';
import {isRecord} from '../utils/typeGuards';

interface Settings {
    confirmSubjectDelete: boolean;
    confirmProfileDelete: boolean;
    /** When false, reset subject progress immediately (sidebar, context menu, data settings). */
    confirmResetSubjectProgress: boolean;
    /** When false, reset topic progress immediately from the context menu. */
    confirmResetTopicProgress: boolean;
    /** When false, wrong answers do not put the question back in the queue (advance-only for this pass). */
    quizRequeueOnIncorrect: boolean;
    /** When false, skipped questions are not reinserted. */
    quizRequeueOnSkip: boolean;
    /** Minimum positions ahead to reinsert (inclusive). Default 4 matches previous app behavior. */
    quizRequeueGapMin: number;
    /** Maximum positions ahead to reinsert (inclusive). */
    quizRequeueGapMax: number;
    /** When false, hide the ambient animated background. */
    animatedBackground: boolean;
    /** Whether the starter sample deck has already been added for this install. */
    sampleDataSeeded: boolean;
}

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

    submitAnswer: (answer: unknown) => {correct: boolean; explanation?: string};
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
    markSampleDataSeeded: () => void;
}

type PersistedQuizSlice = Pick<QuizState, 'profiles' | 'activeProfileId' | 'settings'>;

const DEFAULT_PROFILE_ID = 'default';

function createDefaultProfile(): Profile {
    return {
        id: DEFAULT_PROFILE_ID,
        name: 'Default',
        subjects: [],
        progress: {},
        session: {...DEFAULT_SESSION_STATE},
        createdAt: Date.now()
    };
}

/** Fresh study session before a subject is chosen. Exported for UI fallbacks. */
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
    sampleDataSeeded: false
};

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
        sampleDataSeeded: sanitizeBoolean(raw.sampleDataSeeded, sampleDataSeededFallback)
    };
}

export function sanitizePersistedQuizState(persistedState: unknown): PersistedQuizSlice {
    const hasPersistedState = isRecord(persistedState);
    const input = hasPersistedState ? persistedState : {};
    const profiles: Record<string, Profile> = {};

    if (isRecord(input.profiles)) {
        for (const [profileId, profile] of Object.entries(input.profiles)) {
            try {
                const profileInput = isRecord(profile) && typeof profile.id === 'string'
                    ? profile
                    : {...(isRecord(profile) ? profile : {}), id: profileId};
                const validated = validateProfileImport(profileInput);
                profiles[validated.id] = validated;
            } catch {
                // Drop corrupt persisted profiles instead of letting one bad record break startup.
                console.warn(`Dropping corrupt persisted profile "${profileId}" during hydration.`);
            }
        }
    }

    if (Object.keys(profiles).length === 0) {
        profiles[DEFAULT_PROFILE_ID] = createDefaultProfile();
    }

    const activeProfileId = typeof input.activeProfileId === 'string' && profiles[input.activeProfileId]
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
            ...createQuizCoreActions({
                set,
                get,
                createId: uuidv4,
                getCurrentProfile,
                getCurrentSubject,
                mergeSubjectsIntoList,
                rebuildSessionForSubjectIfActive,
                flattenProgress,
                extractMediaIdsFromQuestion,
                extractMediaIdsFromTopic,
                extractMediaIdsFromSubject,
                cleanupOrphanedMedia,
                reconcileProfileStateForSubjects
            }),

            ...createProfileSettingsActions({
                set,
                get,
                defaultProfileId: DEFAULT_PROFILE_ID,
                defaultSettings: DEFAULT_SETTINGS,
                createDefaultProfile,
                mergeSubjectsIntoList,
                reconcileProfileStateForSubjects,
                removeLocalStorageItem,
                createId: uuidv4,
                defaultSessionState: DEFAULT_SESSION_STATE
            })
        }),
        {
            name: 'quiz-storage',
            version: 1,
            // Use IndexedDB for storage instead of localStorage to avoid quota limits
            storage: createJSONStorage(() => indexedDBStorage),
            migrate: (persistedState: unknown, version: number) => {
                if (version === 0 || version === undefined) {
                    const oldState = isRecord(persistedState) ? persistedState : {};
                    // Migrate from version 0 (flat state) to version 1 (profiles)
                    const defaultProfile: Profile = {
                        id: DEFAULT_PROFILE_ID,
                        name: 'Default',
                        subjects: Array.isArray(oldState.subjects) ? oldState.subjects as Subject[] : [],
                        progress: isRecord(oldState.progress) ? oldState.progress as Profile['progress'] : {},
                        session: {
                            ...DEFAULT_SESSION_STATE,
                            ...(isRecord(oldState.session) ? oldState.session : {}),
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
