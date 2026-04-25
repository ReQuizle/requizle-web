import React from 'react';
import {CheckCheck, Download, RotateCcw, Trash2} from 'lucide-react';
import type {Subject, Topic} from '../../types';
import {ContextMenu, type ContextMenuItem} from '../ContextMenu';

export type ContextMenuState =
    | null
    | {kind: 'subject'; subject: Subject; x: number; y: number; triggerEl?: HTMLElement | null}
    | {kind: 'topic'; subject: Subject; topic: Topic; x: number; y: number; triggerEl?: HTMLElement | null};

type SidebarContextMenuProps = {
    contextMenu: ContextMenuState;
    showResetSubjectProgress: boolean;
    showMarkTopicMastered: boolean;
    showResetTopicProgress: boolean;
    onClose: () => void;
    onQuickExportSubject: (subject: Subject) => void;
    onExportAsSubject: (subject: Subject) => void;
    onResetSubjectProgress: (subject: Subject) => void;
    onDeleteSubject: (subject: Subject) => void;
    onMarkTopicMastered: (subject: Subject, topic: Topic) => void;
    onResetTopicProgress: (subject: Subject, topic: Topic) => void;
};

export const SidebarContextMenu: React.FC<SidebarContextMenuProps> = ({
    contextMenu,
    showResetSubjectProgress,
    showMarkTopicMastered,
    showResetTopicProgress,
    onClose,
    onQuickExportSubject,
    onExportAsSubject,
    onResetSubjectProgress,
    onDeleteSubject,
    onMarkTopicMastered,
    onResetTopicProgress
}) => {
    const items: ContextMenuItem[] = [];

    if (contextMenu?.kind === 'subject') {
        const {subject} = contextMenu;
        items.push({
            id: 'export',
            label: 'Export',
            icon: Download,
            onSelect: () => onQuickExportSubject(subject)
        });
        items.push({
            id: 'export-as',
            label: 'Export as...',
            icon: Download,
            onSelect: () => onExportAsSubject(subject)
        });
        if (showResetSubjectProgress) {
            items.push({
                id: 'reset-progress',
                label: 'Reset subject progress',
                icon: RotateCcw,
                onSelect: () => onResetSubjectProgress(subject)
            });
        }
        items.push({
            id: 'delete',
            label: 'Delete subject',
            icon: Trash2,
            danger: true,
            onSelect: () => onDeleteSubject(subject)
        });
    } else if (contextMenu?.kind === 'topic') {
        const {subject, topic} = contextMenu;
        if (showMarkTopicMastered) {
            items.push({
                id: 'mark-mastered',
                label: 'Mark topic mastered',
                icon: CheckCheck,
                onSelect: () => onMarkTopicMastered(subject, topic)
            });
        }
        if (showResetTopicProgress) {
            items.push({
                id: 'reset-topic',
                label: 'Reset topic progress',
                icon: RotateCcw,
                onSelect: () => onResetTopicProgress(subject, topic)
            });
        }
    }

    return (
        <ContextMenu
            open={!!contextMenu}
            position={contextMenu ? {x: contextMenu.x, y: contextMenu.y} : null}
            triggerEl={contextMenu?.triggerEl ?? null}
            items={items}
            onClose={onClose}
            estimatedHeight={contextMenu?.kind === 'subject' ? 230 : 180}
        />
    );
};
