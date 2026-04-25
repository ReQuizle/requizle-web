import type {Profile} from '../types';
import {validateProfileImport} from '../utils/importValidation';
import {normalizeRequeueGapRange} from '../utils/quizLogic';
import {getCanonicalAppLocationHref} from '../utils/appBaseUrl';
import {clearStoreData} from '../utils/indexedDBStorage';
import {clearAllMedia} from '../utils/mediaStorage';
import type {QuizState} from './useQuizStore';
import {extractMediaIdsFromSubject, cleanupOrphanedMedia} from './quizStoreHelpers';

type SetState = (
    partial: QuizState | Partial<QuizState> | ((state: QuizState) => QuizState | Partial<QuizState>)
) => void;

type CreateProfileSettingsActionsParams = {
    set: SetState;
    get: () => QuizState;
    defaultProfileId: string;
    defaultSettings: QuizState['settings'];
    createDefaultProfile: () => Profile;
    mergeSubjectsIntoList: (existing: Profile['subjects'], incoming: Profile['subjects']) => Profile['subjects'];
    reconcileProfileStateForSubjects: (
        profile: Profile,
        subjects: Profile['subjects']
    ) => Pick<Profile, 'progress' | 'session'>;
    removeLocalStorageItem: (key: string) => void;
    createId: () => string;
    defaultSessionState: Profile['session'];
};

export function createProfileSettingsActions({
    set,
    get,
    defaultProfileId,
    defaultSettings,
    createDefaultProfile,
    mergeSubjectsIntoList,
    reconcileProfileStateForSubjects,
    removeLocalStorageItem,
    createId,
    defaultSessionState
}: CreateProfileSettingsActionsParams): Pick<
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
    | 'markSampleDataSeeded'
> {
    return {
        createProfile: (name) => {
            const normalizedName = name.trim() || 'New profile';
            const newId = createId();
            const newProfile: Profile = {
                id: newId,
                name: normalizedName,
                subjects: [],
                progress: {},
                session: {...defaultSessionState},
                createdAt: Date.now()
            };

            set(state => ({
                profiles: {...state.profiles, [newId]: newProfile},
                activeProfileId: newId
            }));
        },

        renameProfile: (id, newName) => {
            const normalizedName = newName.trim();
            if (!normalizedName) return;
            set(state => {
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
            set(state => {
                if (!state.profiles[id]) return state;
                return {activeProfileId: id};
            });
        },

        deleteProfile: (id) => {
            const profileToDelete = get().profiles[id];
            const mediaToCheck = new Set<string>();
            if (profileToDelete) {
                for (const subject of profileToDelete.subjects) {
                    extractMediaIdsFromSubject(subject).forEach(mediaId => mediaToCheck.add(mediaId));
                }
            }
            set(state => {
                const profileIds = Object.keys(state.profiles);

                if (profileIds.length === 1 && profileIds[0] === id) {
                    const resetDefault = createDefaultProfile();
                    return {
                        profiles: {
                            [defaultProfileId]: resetDefault
                        },
                        activeProfileId: defaultProfileId,
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
            set(state => {
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
                    if (!mergedProgress[subjectId]) {
                        mergedProgress[subjectId] = subjectProgress;
                    } else {
                        const mergedSubjectProgress = {...mergedProgress[subjectId]};
                        for (const [topicId, topicProgress] of Object.entries(subjectProgress)) {
                            mergedSubjectProgress[topicId] = {
                                ...(mergedSubjectProgress[topicId] || {}),
                                ...topicProgress
                            };
                        }
                        mergedProgress[subjectId] = mergedSubjectProgress;
                    }
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
                            // Keep the active in-app session when merging into an existing profile.
                            // Imported session state is validated against the imported subject graph,
                            // not the merged graph.
                            session: reconciled.session
                        }
                    },
                    activeProfileId: validatedProfile.id
                };
            });
        },

        resetAllData: async () => {
            const results = await Promise.allSettled([clearAllMedia(), clearStoreData()]);
            for (const result of results) {
                if (result.status === 'rejected') {
                    console.error('Failed to clear stored data during factory reset:', result.reason);
                }
            }
            removeLocalStorageItem('quiz-storage');
            removeLocalStorageItem('theme');
            set({
                profiles: {[defaultProfileId]: createDefaultProfile()},
                activeProfileId: defaultProfileId,
                settings: {...defaultSettings}
            });

            const canonicalHref = getCanonicalAppLocationHref();
            if (window.location.href === canonicalHref) {
                window.location.reload();
            } else {
                window.location.href = canonicalHref;
            }
        },

        setConfirmSubjectDelete: (confirm) => set((state) => ({
            settings: {...state.settings, confirmSubjectDelete: confirm}
        })),

        setConfirmProfileDelete: (confirm) => set((state) => ({
            settings: {...state.settings, confirmProfileDelete: confirm}
        })),

        setConfirmResetSubjectProgress: (confirm) => set((state) => ({
            settings: {...state.settings, confirmResetSubjectProgress: confirm}
        })),

        setConfirmResetTopicProgress: (confirm) => set((state) => ({
            settings: {...state.settings, confirmResetTopicProgress: confirm}
        })),

        setQuizRequeueOnIncorrect: (value) => set((state) => ({
            settings: {...state.settings, quizRequeueOnIncorrect: value}
        })),

        setQuizRequeueOnSkip: (value) => set((state) => ({
            settings: {...state.settings, quizRequeueOnSkip: value}
        })),

        setQuizRequeueGaps: (minGap, maxGap) => set((state) => {
            const {min, max} = normalizeRequeueGapRange(minGap, maxGap);
            return {
                settings: {
                    ...state.settings,
                    quizRequeueGapMin: min,
                    quizRequeueGapMax: max
                }
            };
        }),

        setAnimatedBackground: (value) => set((state) => ({
            settings: {...state.settings, animatedBackground: value}
        })),

        markSampleDataSeeded: () => set((state) => ({
            settings: {...state.settings, sampleDataSeeded: true}
        }))
    };
}
