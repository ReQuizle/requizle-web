import React from 'react';
import {clsx} from 'clsx';
import {ListOrdered, Shuffle} from 'lucide-react';
import {SettingsSwitchRow} from './SettingsSwitchRow';

type BehaviorSettingsSectionProps = {
    mode: 'random' | 'topic_order';
    quizRequeueOnIncorrect: boolean;
    quizRequeueOnSkip: boolean;
    quizRequeueGapMin: number;
    quizRequeueGapMax: number;
    confirmResetSubjectProgress: boolean;
    confirmResetTopicProgress: boolean;
    confirmSubjectDelete: boolean;
    confirmProfileDelete: boolean;
    onSetMode: (mode: 'random' | 'topic_order') => void;
    onSetQuizRequeueOnIncorrect: (value: boolean) => void;
    onSetQuizRequeueOnSkip: (value: boolean) => void;
    onSetQuizRequeueGaps: (min: number, max: number) => void;
    onSetConfirmResetSubjectProgress: (value: boolean) => void;
    onSetConfirmResetTopicProgress: (value: boolean) => void;
    onSetConfirmSubjectDelete: (value: boolean) => void;
    onSetConfirmProfileDelete: (value: boolean) => void;
};

export const BehaviorSettingsSection: React.FC<BehaviorSettingsSectionProps> = ({
    mode,
    quizRequeueOnIncorrect,
    quizRequeueOnSkip,
    quizRequeueGapMin,
    quizRequeueGapMax,
    confirmResetSubjectProgress,
    confirmResetTopicProgress,
    confirmSubjectDelete,
    confirmProfileDelete,
    onSetMode,
    onSetQuizRequeueOnIncorrect,
    onSetQuizRequeueOnSkip,
    onSetQuizRequeueGaps,
    onSetConfirmResetSubjectProgress,
    onSetConfirmResetTopicProgress,
    onSetConfirmSubjectDelete,
    onSetConfirmProfileDelete
}) => (
    <div
        id="settings-panel-behavior"
        role="tabpanel"
        aria-labelledby="settings-tab-behavior"
        className="space-y-3"
    >
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Behavior</h3>

        <div className="space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Controls how study queues are built and how missed or skipped questions come back. The shuffle button in the quiz header uses the same order setting.
            </p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quiz order</p>
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => onSetMode('random')}
                    className={clsx(
                        'flex items-center justify-center gap-2 min-h-[44px] px-2 rounded-lg text-xs font-semibold border transition-colors',
                        mode === 'random'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600'
                    )}
                >
                    <Shuffle size={16} aria-hidden />
                    Random
                </button>
                <button
                    type="button"
                    onClick={() => onSetMode('topic_order')}
                    className={clsx(
                        'flex items-center justify-center gap-2 min-h-[44px] px-2 rounded-lg text-xs font-semibold border transition-colors',
                        mode === 'topic_order'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600'
                    )}
                >
                    <ListOrdered size={16} aria-hidden />
                    Topic order
                </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Random shuffles the active pool; topic order follows sidebar topic order.
            </p>
        </div>

        <div className="space-y-2 pt-1">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Missed &amp; skipped questions</p>
            <SettingsSwitchRow
                title="Requeue after wrong answer"
                description="Put the card back in the queue so it returns later"
                checked={quizRequeueOnIncorrect}
                onChange={onSetQuizRequeueOnIncorrect}
            />
            <SettingsSwitchRow
                title="Requeue after skip"
                description="Same spacing as wrong answers when enabled"
                checked={quizRequeueOnSkip}
                onChange={onSetQuizRequeueOnSkip}
            />
            <div
                className={clsx(
                    'space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3',
                    !quizRequeueOnIncorrect && !quizRequeueOnSkip && 'opacity-50 pointer-events-none'
                )}
            >
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Reinsert spacing</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Random number of positions ahead (0 = front of remaining queue). App default was 4-6.
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label htmlFor="quiz-gap-min" className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                            Min
                        </label>
                        <input
                            id="quiz-gap-min"
                            type="number"
                            min={0}
                            max={100}
                            inputMode="numeric"
                            value={quizRequeueGapMin}
                            onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (Number.isNaN(v)) return;
                                onSetQuizRequeueGaps(v, quizRequeueGapMax);
                            }}
                            className="w-full px-2 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <div>
                        <label htmlFor="quiz-gap-max" className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                            Max
                        </label>
                        <input
                            id="quiz-gap-max"
                            type="number"
                            min={0}
                            max={100}
                            inputMode="numeric"
                            value={quizRequeueGapMax}
                            onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (Number.isNaN(v)) return;
                                onSetQuizRequeueGaps(quizRequeueGapMin, v);
                            }}
                            className="w-full px-2 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                    </div>
                </div>
            </div>
        </div>

        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pt-1">Progress resets</p>
        <SettingsSwitchRow
            title="Confirm reset subject progress"
            description="Dialog before clearing all mastery for a subject"
            checked={confirmResetSubjectProgress}
            onChange={onSetConfirmResetSubjectProgress}
        />
        <SettingsSwitchRow
            title="Confirm reset topic progress"
            description="Dialog before clearing mastery for one topic"
            checked={confirmResetTopicProgress}
            onChange={onSetConfirmResetTopicProgress}
        />

        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pt-1">Deletion safety</p>
        <SettingsSwitchRow
            title="Confirm subject deletion"
            description="Require typing name to delete; when off, delete immediately"
            checked={confirmSubjectDelete}
            onChange={onSetConfirmSubjectDelete}
        />
        <SettingsSwitchRow
            title="Confirm profile deletion"
            description="Require typing name to delete"
            checked={confirmProfileDelete}
            onChange={onSetConfirmProfileDelete}
        />
    </div>
);
