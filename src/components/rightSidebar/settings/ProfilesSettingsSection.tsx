import React, {useState} from 'react';
import {Check, Download, EllipsisVertical, Pencil, Plus, Trash2, Upload, X} from 'lucide-react';
import {clsx} from 'clsx';
import type {Profile} from '../../../types';
import {ContextMenu, type ContextMenuItem} from '../../ContextMenu';
import {useLongPress} from '../../../utils/useLongPress';
import {IMPORT_FILE_TYPES} from '../useImportWorkflow';
import {plural} from '../../../utils/plural';

type ProfilesSettingsSectionProps = {
    profiles: Record<string, Profile>;
    activeProfileId: string;
    onRenameProfile: (id: string, name: string) => void;
    onSwitchProfile: (id: string) => void;
    onQuickExportProfile: (profile: Profile) => void;
    onOpenProfileExportAs: (profile: Profile) => void;
    onDeleteProfile: (profile: Profile) => void;
    onOpenNewProfileModal: () => void;
    /** Shown here too, since a file chosen from this section is imported away from the Import tab. */
    importError: string | null;
    onImportFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

type ProfileMenuState = {
    profile: Profile;
    x: number;
    y: number;
    triggerEl: HTMLElement | null;
} | null;

export const ProfilesSettingsSection: React.FC<ProfilesSettingsSectionProps> = ({
    profiles,
    activeProfileId,
    onRenameProfile,
    onSwitchProfile,
    onQuickExportProfile,
    onOpenProfileExportAs,
    onDeleteProfile,
    onOpenNewProfileModal,
    importError,
    onImportFileUpload
}) => {
    const [menu, setMenu] = useState<ProfileMenuState>(null);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');

    const saveName = (profileId: string) => {
        const name = editingName.trim();
        if (!name) return;
        onRenameProfile(profileId, name);
        setEditingProfileId(null);
    };

    const openMenu = (profile: Profile, trigger: HTMLElement) => {
        const rect = trigger.getBoundingClientRect();
        setMenu({profile, x: rect.right, y: rect.bottom, triggerEl: trigger});
    };

    const longPressHandlers = useLongPress<Profile>({
        onLongPress: (profile, coords) => {
            setMenu({profile, x: coords.x, y: coords.y, triggerEl: null});
        }
    });

    const menuItems: ContextMenuItem[] = menu
        ? [
              {
                  id: 'rename',
                  label: 'Rename',
                  icon: Pencil,
                  onSelect: () => {
                      setEditingProfileId(menu.profile.id);
                      setEditingName(menu.profile.name);
                  }
              },
              {
                  id: 'export',
                  label: 'Export',
                  icon: Download,
                  onSelect: () => onQuickExportProfile(menu.profile)
              },
              {
                  id: 'export-as',
                  label: 'Export as...',
                  icon: Download,
                  onSelect: () => onOpenProfileExportAs(menu.profile)
              },
              {
                  id: 'delete',
                  label: 'Delete profile',
                  icon: Trash2,
                  danger: true,
                  onSelect: () => onDeleteProfile(menu.profile)
              }
          ]
        : [];

    return (
        <div id="settings-panel-profiles" role="tabpanel" aria-labelledby="settings-tab-profiles" className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Profiles
            </h2>

            <div className="space-y-2">
                {Object.values(profiles)
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((profile) => {
                        const isActive = activeProfileId === profile.id;
                        const isEditing = editingProfileId === profile.id;

                        if (isEditing) {
                            return (
                                <div
                                    key={profile.id}
                                    className="flex items-center gap-1 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/10"
                                >
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                saveName(profile.id);
                                            } else if (e.key === 'Escape') {
                                                setEditingProfileId(null);
                                            }
                                        }}
                                        className="flex-1 px-2 py-1 text-sm font-medium border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        autoFocus
                                        aria-label={`Rename ${profile.name}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => saveName(profile.id)}
                                        className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                        title="Save"
                                        aria-label={`Save name for ${profile.name}`}
                                    >
                                        <Check size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingProfileId(null)}
                                        className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                        title="Cancel"
                                        aria-label={`Cancel renaming ${profile.name}`}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={profile.id}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setMenu({
                                        profile,
                                        x: e.clientX,
                                        y: e.clientY,
                                        triggerEl: e.currentTarget
                                    });
                                }}
                                {...longPressHandlers(profile)}
                                className={clsx(
                                    'rounded-lg border transition-all duration-200 group relative [-webkit-touch-callout:none]',
                                    isActive
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700'
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => !isActive && onSwitchProfile(profile.id)}
                                    className="w-full text-left p-3 pr-24 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                                    aria-current={isActive || undefined}
                                >
                                    <div
                                        className={clsx(
                                            'font-medium text-sm truncate mb-1',
                                            isActive
                                                ? 'text-indigo-700 dark:text-indigo-300'
                                                : 'text-slate-700 dark:text-slate-200'
                                        )}
                                    >
                                        {!isActive && <span className="sr-only">Switch to </span>}
                                        {profile.name}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {plural(profile.subjects.length, 'subject')}
                                    </div>
                                </button>
                                <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                                    {isActive && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold uppercase shrink-0">
                                            Active
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openMenu(profile, e.currentTarget);
                                        }}
                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 text-slate-500 dark:text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                                        aria-label={`Open actions for ${profile.name}`}
                                        aria-haspopup="menu"
                                        aria-expanded={menu?.profile.id === profile.id}
                                    >
                                        <EllipsisVertical size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                    type="button"
                    onClick={onOpenNewProfileModal}
                    className="flex items-center justify-center gap-2 p-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-xs font-medium"
                >
                    <Plus size={14} />
                    New profile
                </button>
                <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-xs font-medium cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500">
                    <Upload size={14} />
                    Import data
                    <input type="file" accept={IMPORT_FILE_TYPES} className="sr-only" onChange={onImportFileUpload} />
                </label>
            </div>

            {importError && (
                <div
                    role="alert"
                    className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs rounded-lg break-words"
                >
                    {importError}
                </div>
            )}

            <ContextMenu
                open={!!menu}
                position={menu ? {x: menu.x, y: menu.y} : null}
                triggerEl={menu?.triggerEl}
                items={menuItems}
                onClose={() => setMenu(null)}
                estimatedHeight={180}
            />
        </div>
    );
};
