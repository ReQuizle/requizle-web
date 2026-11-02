import {v4 as uuidv4} from 'uuid';
import type {Profile} from '../types';
import {validateProfileImport} from '../utils/importValidation';
import {normalizeRequeueGapRange} from '../utils/quizLogic';
import {getCanonicalAppLocationHref} from '../utils/appBaseUrl';
import {clearStoreData} from '../utils/indexedDBStorage';
import {clearAllMedia} from '../utils/mediaStorage';
import {removeLocalStorage} from '../utils/localStorage';
import type {QuizState} from './useQuizStore';
import {createDefaultProfile, DEFAULT_PROFILE_ID, DEFAULT_SETTINGS} from './defaults';
import {sanitizeCustomAccentHex} from '../utils/colorThemes';
import {
    cleanupOrphanedMedia,
    mediaIdsIn,
    mergeSubjectProgress,
    mergeSubjectsIntoList,
    questionsIn,
    reconcileProfileStateForSubjects,
    type SetQuizState
} from './quizStoreHelpers';

export function createProfileSettingsActions(
    set: SetQuizState,
    get: () => QuizState
): Pick<
    QuizState,
    | 'createProfile'
    | 'renameProfile'
    | 'switchProfile'
    | 'deleteProfile'
    | 'importProfile'
    | 'resetAllData'
    | 'setConfirmSubjectDelete'
    | 'setConfirmProfileDelete'
    | 'setConfirmResetSubjectProgress'
    | 'setConfirmResetTopicProgress'
    | 'setQuizRequeueOnIncorrect'
    | 'setQuizRequeueOnSkip'
    | 'setQuizRequeueGaps'
    | 'setAnimatedBackground'
    | 'setColorTheme'
    | 'setCustomAccentColor'
    | 'markSampleDataSeeded'
    | 'setSoundEnabled'
> {
    const updateSettings = (changes: Partial<QuizState['settings']>) =>
        set((state) => ({settings: {...state.settings, ...changes}}));

    return {
        createProfile: (name) => {
            const newProfile: Profile = {...createDefaultProfile(), id: uuidv4(), name: name.trim() || 'New profile'};
            set((state) => ({
                profiles: {...state.profiles, [newProfile.id]: newProfile},
                activeProfileId: newProfile.id
            }));
        },

        renameProfile: (id, newName) => {
            const normalizedName = newName.trim();
            if (!normalizedName) return;
            set((state) => {
                const profile = state.profiles[id];
                if (!profile) return state;

                return {
                    profiles: {
                        ...state.profiles,
                        [id]: {
                            ...profile,
                            name: normalizedName
                        }
                    }
                };
            });
        },

        switchProfile: (id) => {
            set((state) => {
                if (!state.profiles[id]) return state;
                return {activeProfileId: id};
            });
        },

        deleteProfile: (id) => {
            const mediaToCheck = mediaIdsIn(questionsIn(get().profiles[id]?.subjects ?? []));
            set((state) => {
                const profileIds = Object.keys(state.profiles);

                if (profileIds.length === 1 && profileIds[0] === id) {
                    return {
                        profiles: {[DEFAULT_PROFILE_ID]: createDefaultProfile()},
                        activeProfileId: DEFAULT_PROFILE_ID,
                        settings: {...state.settings, sampleDataSeeded: false}
                    };
                }

                const newProfiles = {...state.profiles};
                delete newProfiles[id];

                let newActiveId = state.activeProfileId;
                if (state.activeProfileId === id) {
                    const remaining = Object.values(newProfiles).sort((a, b) => b.createdAt - a.createdAt);
                    newActiveId = remaining[0].id;
                }

                return {
                    profiles: newProfiles,
                    activeProfileId: newActiveId
                };
            });
            cleanupOrphanedMedia(mediaToCheck, get);
        },

        importProfile: (profile) => {
            const validatedProfile = validateProfileImport(profile);
            const mediaBefore = mediaIdsIn(questionsIn(get().profiles[validatedProfile.id]?.subjects ?? []));
            set((state) => {
                const existingProfile = state.profiles[validatedProfile.id];

                if (!existingProfile) {
                    return {
                        profiles: {
                            ...state.profiles,
                            [validatedProfile.id]: validatedProfile
                        },
                        activeProfileId: validatedProfile.id
                    };
                }

                const mergedSubjects = mergeSubjectsIntoList(existingProfile.subjects, validatedProfile.subjects);
                const mergedProgress = {...existingProfile.progress};
                for (const [subjectId, subjectProgress] of Object.entries(validatedProfile.progress)) {
                    mergedProgress[subjectId] = mergeSubjectProgress(mergedProgress[subjectId] ?? {}, subjectProgress);
                }
                const reconciled = reconcileProfileStateForSubjects(
                    {...existingProfile, subjects: mergedSubjects, progress: mergedProgress},
                    mergedSubjects
                );

                return {
                    profiles: {
                        ...state.profiles,
                        [validatedProfile.id]: {
                            ...existingProfile,
                            ...validatedProfile,
                            subjects: mergedSubjects,
                            progress: reconciled.progress,
                            // `session` stays consistent with merged subjects + progress
                            session: reconciled.session
                        }
                    },
                    activeProfileId: validatedProfile.id
                };
            });
            cleanupOrphanedMedia(mediaBefore, get);
        },

        resetAllData: async () => {
            const results = await Promise.allSettled([clearAllMedia(), clearStoreData()]);
            for (const result of results) {
                if (result.status === 'rejected') {
                    console.error('Failed to clear stored data during factory reset:', result.reason);
                }
            }
            removeLocalStorage('theme');
            set({
                profiles: {[DEFAULT_PROFILE_ID]: createDefaultProfile()},
                activeProfileId: DEFAULT_PROFILE_ID,
                settings: {...DEFAULT_SETTINGS}
            });

            const canonicalHref = getCanonicalAppLocationHref();
            if (window.location.href === canonicalHref) {
                window.location.reload();
            } else {
                window.location.href = canonicalHref;
            }
        },

        setConfirmSubjectDelete: (confirm) => updateSettings({confirmSubjectDelete: confirm}),

        setConfirmProfileDelete: (confirm) => updateSettings({confirmProfileDelete: confirm}),

        setConfirmResetSubjectProgress: (confirm) => updateSettings({confirmResetSubjectProgress: confirm}),

        setConfirmResetTopicProgress: (confirm) => updateSettings({confirmResetTopicProgress: confirm}),

        setQuizRequeueOnIncorrect: (value) => updateSettings({quizRequeueOnIncorrect: value}),

        setQuizRequeueOnSkip: (value) => updateSettings({quizRequeueOnSkip: value}),

        setQuizRequeueGaps: (minGap, maxGap) => {
            const {min, max} = normalizeRequeueGapRange(minGap, maxGap);
            updateSettings({quizRequeueGapMin: min, quizRequeueGapMax: max});
        },

        setAnimatedBackground: (value) => updateSettings({animatedBackground: value}),

        setColorTheme: (value) => updateSettings({colorTheme: value}),

        setCustomAccentColor: (value) =>
            set((state) => ({
                settings: {
                    ...state.settings,
                    customAccentColor: sanitizeCustomAccentHex(value, state.settings.customAccentColor),
                    colorTheme: 'custom'
                }
            })),

        markSampleDataSeeded: () => updateSettings({sampleDataSeeded: true}),

        setSoundEnabled: (value) => updateSettings({soundEnabled: value})
    };
}
