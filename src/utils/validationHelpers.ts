// Both compare entries after trimming, so " cat" and "cat" count as the same word.

export function hasDuplicateStrings(values: string[]): boolean {
    const trimmed = values.map((value) => value.trim());
    return new Set(trimmed).size !== trimmed.length;
}

/** Whether the word bank holds every answer, counting a word once for each time it is needed. */
export function hasEnoughWordBankEntries(wordBank: string[], answers: string[]): boolean {
    const remaining = new Map<string, number>();
    for (const word of wordBank) {
        const key = word.trim();
        remaining.set(key, (remaining.get(key) ?? 0) + 1);
    }

    for (const answer of answers) {
        const key = answer.trim();
        const count = remaining.get(key) ?? 0;
        if (count === 0) return false;
        remaining.set(key, count - 1);
    }

    return true;
}
