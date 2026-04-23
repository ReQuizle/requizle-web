type NormalizeOptions = {
    trim?: boolean;
};

function normalizeString(value: string, options?: NormalizeOptions): string {
    return options?.trim ? value.trim() : value;
}

export function hasDuplicateStrings(values: string[], options?: NormalizeOptions): boolean {
    const seen = new Set<string>();
    for (const value of values) {
        const normalized = normalizeString(value, options);
        if (seen.has(normalized)) return true;
        seen.add(normalized);
    }
    return false;
}

export function hasEnoughWordBankEntries(wordBank: string[], answers: string[], options?: NormalizeOptions): boolean {
    const remaining = new Map<string, number>();
    for (const word of wordBank) {
        const normalized = normalizeString(word, options);
        remaining.set(normalized, (remaining.get(normalized) ?? 0) + 1);
    }

    for (const answer of answers) {
        const normalized = normalizeString(answer, options);
        const count = remaining.get(normalized) ?? 0;
        if (count <= 0) return false;
        remaining.set(normalized, count - 1);
    }

    return true;
}
