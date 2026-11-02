import {useState} from 'react';
import {Save} from 'lucide-react';
import {FIELD_CLASS} from './fieldStyles';

interface EditableNameProps {
    initialName: string;
    onSave: (name: string) => void;
    /** Names the field for screen readers, such as "Subject name" */
    label: string;
}

/**
 * A name field with a Save button. Remount it (with a `key`) to reset it to a new name.
 */
export function EditableName({initialName, onSave, label}: EditableNameProps) {
    const [name, setName] = useState(initialName);

    return (
        <form
            className="flex gap-2"
            onSubmit={(event) => {
                event.preventDefault();
                const trimmed = name.trim();
                if (trimmed) onSave(trimmed);
            }}
        >
            <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={`flex-1 ${FIELD_CLASS}`}
                placeholder={label}
                aria-label={label}
            />
            <button
                type="submit"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
                <Save size={16} />
                Save
            </button>
        </form>
    );
}
