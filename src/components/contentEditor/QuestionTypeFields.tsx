import {useId, useState} from 'react';
import {Trash2} from 'lucide-react';
import type {Question} from '../../types';
import {
    ADD_ROW_BUTTON_CLASS,
    COMPACT_FIELD_CLASS,
    FIELD_CLASS,
    FIELD_LABEL_CLASS,
    REMOVE_ROW_BUTTON_CLASS
} from './fieldStyles';

interface QuestionTypeFieldsProps {
    draft: Question;
    setDraft: (question: Question) => void;
}

const replaceAt = <T,>(items: T[], index: number, item: T) => items.map((current, i) => (i === index ? item : current));
const removeAt = <T,>(items: T[], index: number) => items.filter((_, i) => i !== index);

/**
 * The answer fields for the draft's question type.
 */
export function QuestionTypeFields({draft, setDraft}: QuestionTypeFieldsProps) {
    switch (draft.type) {
        case 'true_false':
            return (
                <fieldset>
                    <legend className={FIELD_LABEL_CLASS}>Correct answer</legend>
                    <div className="flex gap-4">
                        {[true, false].map((value) => (
                            <label key={String(value)} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name={`tf-correct-${draft.id}`}
                                    checked={draft.answer === value}
                                    onChange={() => setDraft({...draft, answer: value})}
                                />
                                {value ? 'True' : 'False'}
                            </label>
                        ))}
                    </div>
                </fieldset>
            );

        case 'multiple_choice':
            return (
                <ChoicesEditor
                    label="Choices"
                    choices={draft.choices}
                    multiple={false}
                    groupName={`mc-correct-${draft.id}`}
                    isCorrect={(i) => draft.answerIndex === i}
                    onToggleCorrect={(i) => setDraft({...draft, answerIndex: i})}
                    onChoicesChange={(choices) => setDraft({...draft, choices})}
                    onRemove={(i) => {
                        // Keep the same choice marked correct, or the first one if it was removed
                        let answerIndex = draft.answerIndex;
                        if (i < answerIndex) answerIndex -= 1;
                        else if (i === answerIndex) answerIndex = 0;
                        setDraft({...draft, choices: removeAt(draft.choices, i), answerIndex});
                    }}
                />
            );

        case 'multiple_answer':
            return (
                <ChoicesEditor
                    label="Choices (check all correct)"
                    choices={draft.choices}
                    multiple
                    groupName={`ma-correct-${draft.id}`}
                    isCorrect={(i) => draft.answerIndices.includes(i)}
                    onToggleCorrect={(i) =>
                        setDraft({
                            ...draft,
                            answerIndices: draft.answerIndices.includes(i)
                                ? draft.answerIndices.filter((index) => index !== i)
                                : [...draft.answerIndices, i].sort((a, b) => a - b)
                        })
                    }
                    onChoicesChange={(choices) => setDraft({...draft, choices})}
                    onRemove={(i) =>
                        setDraft({
                            ...draft,
                            choices: removeAt(draft.choices, i),
                            // Later choices move up one place
                            answerIndices: draft.answerIndices
                                .filter((index) => index !== i)
                                .map((index) => (index > i ? index - 1 : index))
                        })
                    }
                />
            );

        case 'keywords':
            return (
                <div className="space-y-2">
                    <TextListField
                        key={draft.id}
                        label="Accepted answers (one per line)"
                        separator="lines"
                        values={Array.isArray(draft.answer) ? draft.answer : [draft.answer]}
                        onChange={(answers) =>
                            // A single accepted answer is stored as a string
                            setDraft({...draft, answer: answers.length <= 1 ? (answers[0] ?? '') : answers})
                        }
                    />
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                            type="checkbox"
                            checked={draft.caseSensitive ?? false}
                            onChange={(event) => setDraft({...draft, caseSensitive: event.target.checked})}
                        />
                        Case sensitive
                    </label>
                </div>
            );

        case 'matching':
            return (
                <fieldset className="space-y-2">
                    <legend className={FIELD_LABEL_CLASS}>Pairs</legend>
                    {draft.pairs.map((pair, i) => (
                        <div key={i} className="flex flex-wrap gap-2">
                            {(['left', 'right'] as const).map((side) => (
                                <input
                                    key={side}
                                    type="text"
                                    placeholder={side === 'left' ? 'Left' : 'Right'}
                                    aria-label={`Pair ${i + 1} ${side}`}
                                    value={pair[side]}
                                    onChange={(event) =>
                                        setDraft({
                                            ...draft,
                                            pairs: replaceAt(draft.pairs, i, {...pair, [side]: event.target.value})
                                        })
                                    }
                                    className={`${COMPACT_FIELD_CLASS} min-w-[calc(50%-2rem)]`}
                                />
                            ))}
                            <button
                                type="button"
                                title="Remove pair"
                                aria-label={`Remove pair ${i + 1}`}
                                onClick={() => {
                                    const pairs = removeAt(draft.pairs, i);
                                    setDraft({...draft, pairs: pairs.length ? pairs : [{left: '', right: ''}]});
                                }}
                                className={REMOVE_ROW_BUTTON_CLASS}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => setDraft({...draft, pairs: [...draft.pairs, {left: '', right: ''}]})}
                        className={ADD_ROW_BUTTON_CLASS}
                    >
                        + Add pair
                    </button>
                </fieldset>
            );

        case 'word_bank':
            return (
                <div className="space-y-2">
                    <SentenceField value={draft.sentence} onChange={(sentence) => setDraft({...draft, sentence})} />
                    <TextListField
                        key={`${draft.id}-bank`}
                        label="Word bank (comma-separated)"
                        separator="commas"
                        values={draft.wordBank}
                        onChange={(wordBank) => setDraft({...draft, wordBank: wordBank.length ? wordBank : ['']})}
                    />
                    <TextListField
                        key={`${draft.id}-answers`}
                        label="Correct words in blank order (comma-separated)"
                        separator="commas"
                        values={draft.answers}
                        onChange={(answers) => setDraft({...draft, answers: answers.length ? answers : ['']})}
                    />
                </div>
            );
    }
}

interface ChoicesEditorProps {
    label: string;
    choices: string[];
    /** Checkboxes when several choices can be correct, radio buttons when only one can */
    multiple: boolean;
    groupName: string;
    isCorrect: (index: number) => boolean;
    onToggleCorrect: (index: number) => void;
    onChoicesChange: (choices: string[]) => void;
    onRemove: (index: number) => void;
}

/** Edit a question's choices and mark which are correct. At least two choices are kept. */
function ChoicesEditor({
    label,
    choices,
    multiple,
    groupName,
    isCorrect,
    onToggleCorrect,
    onChoicesChange,
    onRemove
}: ChoicesEditorProps) {
    const canRemove = choices.length > 2;

    return (
        <fieldset className="space-y-2">
            <legend className={FIELD_LABEL_CLASS}>{label}</legend>
            {choices.map((choice, i) => (
                <div key={i} className="flex gap-2 items-center">
                    <input
                        type={multiple ? 'checkbox' : 'radio'}
                        name={groupName}
                        checked={isCorrect(i)}
                        onChange={() => onToggleCorrect(i)}
                        aria-label={`Choice ${i + 1} is correct`}
                    />
                    <input
                        type="text"
                        value={choice}
                        onChange={(event) => onChoicesChange(replaceAt(choices, i, event.target.value))}
                        aria-label={`Choice ${i + 1}`}
                        className={COMPACT_FIELD_CLASS}
                    />
                    <button
                        type="button"
                        title="Remove choice"
                        aria-label={`Remove choice ${i + 1}`}
                        disabled={!canRemove}
                        onClick={() => onRemove(i)}
                        className={REMOVE_ROW_BUTTON_CLASS}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
            <button type="button" onClick={() => onChoicesChange([...choices, ''])} className={ADD_ROW_BUTTON_CLASS}>
                + Add choice
            </button>
        </fieldset>
    );
}

function SentenceField({value, onChange}: {value: string; onChange: (sentence: string) => void}) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className={FIELD_LABEL_CLASS}>
                Sentence (use _ for each blank)
            </label>
            <textarea
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                rows={2}
                className={FIELD_CLASS}
            />
        </div>
    );
}

interface TextListFieldProps {
    label: string;
    /** Entries go one per line, or are separated by commas */
    separator: 'lines' | 'commas';
    values: string[];
    onChange: (values: string[]) => void;
}

/**
 * A text field holding a list of entries. It keeps the text as typed, so a trailing comma or
 * new line stays while the next entry is written; the trimmed, non-empty entries are reported.
 * Remount it (with a `key`) when the list belongs to a different question.
 */
function TextListField({label, separator, values, onChange}: TextListFieldProps) {
    const id = useId();
    const [text, setText] = useState(values.join(separator === 'lines' ? '\n' : ', '));
    const splitOn = separator === 'lines' ? '\n' : ',';

    const handleChange = (next: string) => {
        setText(next);
        onChange(
            next
                .split(splitOn)
                .map((entry) => entry.trim())
                .filter(Boolean)
        );
    };

    return (
        <div>
            <label htmlFor={id} className={FIELD_LABEL_CLASS}>
                {label}
            </label>
            {separator === 'lines' ? (
                <textarea
                    id={id}
                    value={text}
                    onChange={(event) => handleChange(event.target.value)}
                    rows={3}
                    className={FIELD_CLASS}
                />
            ) : (
                <input
                    id={id}
                    type="text"
                    value={text}
                    onChange={(event) => handleChange(event.target.value)}
                    className={FIELD_CLASS}
                />
            )}
        </div>
    );
}
