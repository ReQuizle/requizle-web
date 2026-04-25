import React, {useState} from 'react';
import {Check, Download, EllipsisVertical, Pencil, Plus, Trash2, Upload, X} from 'lucide-react';
import {clsx} from 'clsx';
import type {Profile} from '../../../types';
import {ContextMenu, type ContextMenuItem} from '../../ContextMenu';
import {useLongPress} from '../../../utils/useLongPress';

type ProfilesSettingsSectionProps = {
    profiles: Record<string, Profile>;
    activeProfileId: string;
    editingProfileId: string | null;
    editingName: string;
    onSetEditingProfileId: (id: string | null) => void;
    onSetEditingName: (name: string) => void;
    onRenameProfile: (id: string, name: string) => void;
    onSwitchProfile: (id: string) => void;
    onExportProfile: (profile: Profile) => void;
    onDeleteProfile: (profile: Profile) => void;
    onOpenNewProfileModal: () => void;
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
    editingProfileId,
    editingName,
    onSetEditingProfileId,
    onSetEditingName,
    onRenameProfile,
    onSwitchProfile,
    onExportProfile,
    onDeleteProfile,
    onOpenNewProfileModal,
    onImportFileUpload
}) => {
    const [menu, setMenu] = useState<ProfileMenuState>(null);

    const closeMenu = () => setMenu(null);

    const openMenu = (profile: Profile, trigger: HTMLElement) => {
        const rect = trigger.getBoundingClientRect();
        setMenu({profile, x: rect.right, y: rect.bottom, triggerEl: trigger});
    };

    const {
        startLongPress,
        onLongPressTouchMove,
        onLongPressTouchEnd,
        swallowSyntheticClickAfterLongPress
    } = useLongPress<Profile>({
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
                    onSetEditingProfileId(menu.profile.id);
                    onSetEditingName(menu.profile.name);
                    closeMenu();
                }
            },
            {
                id: 'export',
                label: 'Export',
                icon: Download,
                onSelect: () => {
                    onExportProfile(menu.profile);
                    closeMenu();
                }
            },
            {
                id: 'delete',
                label: 'Delete profile',
                icon: Trash2,
                danger: true,
                onSelect: () => {
                    onDeleteProfile(menu.profile);
                    closeMenu();
                }
            }
        ]
        : [];

    return (
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
                    .map(profile => {
                        const isActive = activeProfileId === profile.id;
                        const isEditing = editingProfileId === profile.id;

                        if (isEditing) {
                            return (
                                <div
                                    key={profile.id}
                                    className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-900/10"
                                >
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={e => onSetEditingName(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && editingName.trim()) {
                                                    onRenameProfile(profile.id, editingName.trim());
                                                    onSetEditingProfileId(null);
                                                } else if (e.key === 'Escape') {
                                                    onSetEditingProfileId(null);
                                                }
                                            }}
                                            className="flex-1 px-2 py-1 text-sm font-medium border border-indigo-300 dark:border-indigo-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                            autoFocus
                                            aria-label={`Rename ${profile.name}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (editingName.trim()) {
                                                    onRenameProfile(profile.id, editingName.trim());
                                                    onSetEditingProfileId(null);
                                                }
                                            }}
                                            className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                            title="Save"
                                            aria-label={`Save name for ${profile.name}`}
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onSetEditingProfileId(null)}
                                            className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                            title="Cancel"
                                            aria-label={`Cancel renaming ${profile.name}`}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={profile.id}
                                onContextMenu={e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setMenu({
                                        profile,
                                        x: e.clientX,
                                        y: e.clientY,
                                        triggerEl: e.currentTarget
                                    });
                                }}
                                onTouchStart={e => startLongPress(profile, e)}
                                onTouchMove={onLongPressTouchMove}
                                onTouchEnd={onLongPressTouchEnd}
                                onTouchCancel={onLongPressTouchEnd}
                                onClickCapture={swallowSyntheticClickAfterLongPress}
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
                                    aria-label={isActive ? `${profile.name} (active)` : `Switch to ${profile.name}`}
                                >
                                    <div
                                        className={clsx(
                                            'font-medium text-sm truncate mb-1',
                                            isActive
                                                ? 'text-indigo-700 dark:text-indigo-300'
                                                : 'text-slate-700 dark:text-slate-200'
                                        )}
                                    >
                                        {profile.name}
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        {profile.subjects.length} {profile.subjects.length === 1 ? 'subject' : 'subjects'}
                                    </div>
                                </button>
                                <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                                    {isActive && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold uppercase flex-shrink-0">
                                            Active
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={e => {
                                            e.stopPropagation();
                                            openMenu(profile, e.currentTarget);
                                        }}
                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
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
                        accept=".rqzl,.zip,.json"
                        className="hidden"
                        onChange={onImportFileUpload}
                    />
                </label>
            </div>

            <ContextMenu
                open={!!menu}
                position={menu ? {x: menu.x, y: menu.y} : null}
                triggerEl={menu?.triggerEl}
                items={menuItems}
                onClose={closeMenu}
                estimatedHeight={180}
            />
        </div>
    );
};
