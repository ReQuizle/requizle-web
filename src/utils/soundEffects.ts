const MAX_GAIN = 0.07;

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (sharedContext) return sharedContext;
    const AC =
        window.AudioContext ||
        (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!AC) return null;
    sharedContext = new AC();
    return sharedContext;
}

function beep(
    ctx: AudioContext,
    frequency: number,
    start: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = MAX_GAIN
) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.start(start);
    osc.stop(start + duration + 0.03);
}

async function playSequence(kind: 'correct' | 'incorrect' | 'skip' | 'continue') {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
    } catch {
        return;
    }
    const t0 = ctx.currentTime;
    switch (kind) {
        case 'correct':
            beep(ctx, 523.25, t0, 0.1);
            beep(ctx, 659.25, t0 + 0.11, 0.12);
            break;
        case 'incorrect':
            beep(ctx, 155, t0, 0.18, 'triangle', MAX_GAIN * 0.9);
            break;
        case 'skip':
            beep(ctx, 420, t0, 0.05, 'sine', MAX_GAIN * 0.5);
            break;
        case 'continue':
            beep(ctx, 350, t0, 0.04, 'sine', MAX_GAIN * 0.35);
            break;
    }
}

/**
 * Short UI tones for quiz feedback. No external assets; uses Web Audio (requires a user gesture to unlock on some browsers).
 */
export function playQuizSound(kind: 'correct' | 'incorrect' | 'skip' | 'continue', soundEnabled: boolean): void {
    if (!soundEnabled) return;
    void playSequence(kind);
}
