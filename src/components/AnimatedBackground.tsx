import React from 'react';

export const AnimatedBackground: React.FC = () => (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute top-[-6rem] left-[-6rem] h-[32rem] w-[32rem] rounded-full bg-indigo-400/30 dark:bg-indigo-500/15 blur-3xl animate-ambient-blob" />
        <div className="absolute top-[30%] right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-purple-400/30 dark:bg-purple-500/15 blur-3xl animate-ambient-blob animation-delay-7000" />
        <div className="absolute bottom-[-8rem] left-[20%] h-[34rem] w-[34rem] rounded-full bg-fuchsia-400/25 dark:bg-fuchsia-500/10 blur-3xl animate-ambient-blob animation-delay-14000" />
    </div>
);
