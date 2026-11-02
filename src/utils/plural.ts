/** A count with its noun, such as "1 topic" or "3 topics". */
export const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;
