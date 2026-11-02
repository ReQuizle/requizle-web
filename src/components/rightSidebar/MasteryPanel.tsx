import React from 'react';

export type MasteryStats = {
    subjectMastery: number;
    selectionMastery: number;
    activeQuestionCount: number;
};

type MasteryPanelProps = {
    /** Null when no subject is open */
    stats: MasteryStats | null;
};

const CARD_CLASS = 'bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm';

export const MasteryPanel: React.FC<MasteryPanelProps> = ({stats}) => {
    if (!stats) {
        return (
            <div className="text-center text-slate-500 dark:text-slate-400 py-10">Select a subject to view mastery</div>
        );
    }

    const cards = [
        {label: 'Subject', value: stats.subjectMastery, barClass: 'quiz-progress-indigo'},
        {label: 'Selection', value: stats.selectionMastery, barClass: 'quiz-progress-emerald'}
    ];

    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                {cards.map(({label, value, barClass}) => (
                    <div key={label} className={CARD_CLASS}>
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">
                            {label}
                        </div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}%</div>
                        <progress
                            className={`quiz-progress ${barClass}`}
                            value={value}
                            max={100}
                            aria-label={`${label} mastery`}
                        />
                    </div>
                ))}
            </div>

            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                <span>Active questions</span>
                <span className="font-medium text-slate-900 dark:text-slate-200">{stats.activeQuestionCount}</span>
            </div>
        </>
    );
};
