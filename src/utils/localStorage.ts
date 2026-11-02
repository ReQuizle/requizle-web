// localStorage throws when the browser blocks site storage, as private browsing can. These
// treat that as nothing being saved, and the app keeps working from memory.

export function readLocalStorage(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

export function writeLocalStorage(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        // The value lasts until the page is closed
    }
}

export function removeLocalStorage(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // Nothing could have been saved, so there is nothing to remove
    }
}
