import '@testing-library/jest-dom';

// jsdom does not implement scrolling and logs an error when it is called
window.scrollTo = () => {};

// jsdom has no matchMedia; the tests run as if no media query matches
window.matchMedia = (query) =>
    ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {}
    }) as unknown as MediaQueryList;

// jsdom's Blob has no text()
Blob.prototype.text = function (this: Blob) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(this);
    });
};
