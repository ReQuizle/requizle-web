import React from 'react';
import {Check, Download, Pencil, Plus, Trash2, Upload, X} from 'lucide-react';
import {clsx} from 'clsx';
import type {Profile} from '../../../types';

type ProfilesSettingsSectionProps = {
    profiles: Record<string, Profile>;
    activeProfileId: string;
    editingProfileId: string | null;
    editingName: string;
    confirmProfileDelete: boolean;
    onSetEditingProfileId: (id: string | null) => void;
    onSetEditingName: (name: string) => void;
    onRenameProfile: (id: string, name: string) => void;
    onSwitchProfile: (id: string) => void;
    onExportProfile: (profile: Profile) => void;
    onDeleteProfile: (profile: Profile) => void;
    onOpenNewProfileModal: () => void;
    onImportFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const ProfilesSettingsSection: React.FC<ProfilesSettingsSectionProps> = ({
    profiles,
    activeProfileId,
    editingProfileId,
    editingName,
    confirmProfileDelete,
    onSetEditingProfileId,
    onSetEditingName,
    onRenameProfile,
    onSwitchProfile,
    onExportProfile,
    onDeleteProfile,
    onOpenNewProfileModal,
    onImportFileUpload
}) => (
    <div
        id="settings-panel-profiles"
        role="tabpanel"
        aria-labelledby="settings-tab-profiles"
        className="space-y-3"
    >
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Profiles</h3>

        <div className="space-y-2">
            {Object.values(profiles)
                .sort((a, b) => b.createdAt - a.createdAt)
                .map(profile => (
                    <div
                        key={profile.id}
                        className={clsx(
                            'p-3 rounded-lg border transition-all group',
                            activeProfileId === profile.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700'
                        )}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {editingProfileId === profile.id ? (
                                    <div className="flex items-center gap-1 flex-1">
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => onSetEditingName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && editingName.trim()) {
                                                    onRenameProfile(profile.id, editingName.trim());
                                                    onSetEditingProfileId(null);
                                                } else if (e.key === 'Escape') {
                                                    onSetEditingProfileId(null);
                                                }
                                            }}
                                            className="flex-1 px-2 py-0.5 text-sm font-medium border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => {
                                                if (editingName.trim()) {
                                                    onRenameProfile(profile.id, editingName.trim());
                                                    onSetEditingProfileId(null);
                                                }
                                            }}
                                            className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                            title="Save"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            onClick={() => onSetEditingProfileId(null)}
                                            className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                            title="Cancel"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span
                                            className={clsx(
                                                'font-medium text-sm truncate',
                                                activeProfileId === profile.id
                                                    ? 'text-indigo-700 dark:text-indigo-300'
                                                    : 'text-slate-700 dark:text-slate-200'
                                            )}
                                        >
                                            {profile.name}
                                        </span>
                                        <button
                                            onClick={() => {
                                                onSetEditingProfileId(profile.id);
                                                onSetEditingName(profile.name);
                                            }}
                                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            title="Rename Profile"
                                        >
                                            <Pencil size={12} />
                                        </button>
                                        {activeProfileId === profile.id && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold uppercase flex-shrink-0">
                                                Active
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                            {editingProfileId !== profile.id && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                        onClick={() => onExportProfile(profile)}
                                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                        title="Export Profile"
                                    >
                                        <Download size={14} />
                                    </button>
                                    <button
                                        onClick={() => onDeleteProfile(profile)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                        title={confirmProfileDelete ? 'Delete Profile (confirm required)' : 'Delete Profile'}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>{profile.subjects.length} Subjects</span>
                            {activeProfileId !== profile.id && (
                                <button
                                    onClick={() => onSwitchProfile(profile.id)}
                                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                >
                                    Switch to this profile
                                </button>
                            )}
                        </div>
                    </div>
                ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
            <button
                type="button"
                onClick={onOpenNewProfileModal}
                className="flex items-center justify-center gap-2 p-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-xs font-medium"
            >
                <Plus size={14} />
                New Profile
            </button>
            <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-xs font-medium cursor-pointer">
                <Upload size={14} />
                Import Data
                <input
                    type="file"
                    accept=".rqzl,.json"
                    className="hidden"
                    onChange={onImportFileUpload}
                />
            </label>
        </div>
    </div>
);
