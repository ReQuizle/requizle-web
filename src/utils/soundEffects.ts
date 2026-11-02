const MAX_GAIN = 0.07;

type QuizSound = 'correct' | 'incorrect' | 'skip' | 'continue';

let sharedContext: AudioContext | undefined;

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

async function playSequence(kind: QuizSound) {
    sharedContext ??= new AudioContext();
    const ctx = sharedContext;
    if (ctx.state === 'suspended') {
        await ctx.resume();
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

/** Short tones for quiz feedback, made with Web Audio. */
export function playQuizSound(kind: QuizSound, soundEnabled: boolean): void {
    if (!soundEnabled) return;
    playSequence(kind).catch(() => {
        // The browser can refuse to start audio, and the quiz works the same without it
    });
}
