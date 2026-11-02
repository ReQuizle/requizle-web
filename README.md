# ReQuizle

[![CI](https://github.com/ReQuizle/requizle-web/actions/workflows/ci.yml/badge.svg)](https://github.com/ReQuizle/requizle-web/actions/workflows/ci.yml)

<img src="public/icon.svg" alt="ReQuizle logo" width="250">

ReQuizle is a browser-based study app built around active recall and repeated review.

**Live app:** [requizle.github.io/requizle-web](https://requizle.github.io/requizle-web/)

## Features

- Six question types: multiple choice, multiple answer, true or false, keywords (typed answers), matching, and word bank
- Missed and skipped questions return a few questions later in the session, with an option to include or skip mastered questions
- Mastery tracking for each subject and topic
- Question text with Markdown-style formatting, tables, code blocks with syntax highlighting, and LaTeX math (`\(...\)` inline, `\[...\]` block)
- Images and videos from a URL or an uploaded file
- An editor for creating subjects, topics, and questions in the app
- Import and export of subjects and full profiles as `.json` or `.rqzl` (a ZIP archive that includes media)
- Multiple study profiles, light and dark themes, accent colors, and optional sound effects
- Installable as a Progressive Web App
- All data is stored locally in the browser with IndexedDB; there is no server

## Documentation

The [ReQuizle documentation](https://requizle.github.io/requizle-wiki/) covers the app in detail:

- [User guide](https://requizle.github.io/requizle-wiki/guide)
- [Import, export, and file formats](https://requizle.github.io/requizle-wiki/import-export)
- [Development guide](https://requizle.github.io/requizle-wiki/development)

## Development

Requires Node.js 20.19+ or 22.12+.

```bash
git clone https://github.com/ReQuizle/requizle-web.git
cd requizle-web
npm ci
npm run dev
```

The study view runs at `http://localhost:5173/` and the content editor at `http://localhost:5173/edit`.

Production builds use the GitHub Pages path `/requizle-web/`. To deploy somewhere else, set `VITE_APP_BASE` before building, for example `/` for a domain root.

| Command | Purpose |
| :--- | :--- |
| `npm test` | Run the tests once |
| `npm run test:watch` | Run the tests in watch mode |
| `npm run test:coverage` | Run the tests with a coverage report |
| `npm run lint` | Check the code with ESLint |
| `npm run format` | Format the code with Prettier |
| `npm run type-check` | Check types with TypeScript |
| `npm run build` | Build the production site into `dist/` |
| `npm run deploy` | Build and publish to GitHub Pages |

## Project Structure

```text
src/
+-- components/   React components; inputs/ holds one component per question type
+-- context/      Theme context
+-- pages/        Full-page routes such as the content editor
+-- store/        Zustand store and its action modules
+-- utils/        Quiz logic, import validation, media storage, .rqzl archives, and helpers
+-- test/         Test setup
+-- App.tsx       Root component
+-- router.tsx    Routes for the study view and the editor
+-- types.ts      Shared types
```

## Credits

- [React](https://react.dev/) and [React Router](https://reactrouter.com/)
- [Zustand](https://github.com/pmndrs/zustand) for state management
- [Tailwind CSS](https://tailwindcss.com/) and [Framer Motion](https://motion.dev/) for styling and animation
- [Lucide](https://lucide.dev/) for icons
- [KaTeX](https://katex.org/) for math rendering
- [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) for code blocks
- [JSZip](https://stuk.github.io/jszip/) for `.rqzl` archives
- [canvas-confetti](https://www.npmjs.com/package/canvas-confetti) for celebration effects
- [Vite](https://vite.dev/) and [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for building and offline support

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
