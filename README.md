# ReQuizle

[![CI](https://github.com/ReQuizle/requizle-web/actions/workflows/ci.yml/badge.svg)](https://github.com/ReQuizle/requizle-web/actions/workflows/ci.yml)

<img src="public/icon.svg" alt="ReQuizle Logo" width="250">

ReQuizle is a modern web application designed to help users study efficiently through spaced repetition and active recall.

## Features

- **Focused Study Experience**: Clean, distraction-free UI with smooth animations.
- **Mastery Tracking**: Track progress and mastery percentage for each subject and topic.
- **Spaced Repetition**: Option to include or exclude mastered questions from the study queue.
- **Multiple Question Types**: Support for various question formats:
  - Multiple Choice
  - Multiple Answer
  - True/False
  - Keywords
  - Matching
  - Word Bank
- **LaTeX Support**: Render mathematical equations using `\(...\)` (inline) and `\[...\]` (block) syntax.
- **Media Support**: Add images or videos to questions via URL, base64, or local file upload.
- **Data Persistence**: Progress automatically saved to IndexedDB for large datasets.
- **Custom Content Import**: Import your own subjects and questions via JSON with automatic type detection.
- **Profile Management**: Create, rename, and manage multiple study profiles.
- **Dark Mode**: Built-in theme toggle for comfortable studying.
- **Responsive Design**: Works seamlessly on desktop and mobile devices.
- **Collapsible Sidebars**: Hide sidebars for a focused study experience.
- **Installable**: Can be installed as a Progressive Web App (PWA) on desktop and mobile.
- **Privacy-Focused**: All data is stored locally in your browser - no server required.

## Documentation

For full guides, file formats, and development instructions, please visit the **[Official Documentation](https://requizle.github.io/requizle-wiki/)**.

- [User Guide](https://requizle.github.io/requizle-wiki/guide)
- [Import/Export & File Formats](https://requizle.github.io/requizle-wiki/import-export)
- [Development Guide](https://requizle.github.io/requizle-wiki/development)

## Prerequisites

- Node.js 18.x or higher
- npm (Node Package Manager)
- A modern web browser

## Installation

```bash
git clone https://github.com/ReQuizle/requizle-web.git
cd requizle-web
npm install
```

## Usage

```bash
npm run dev
```

1. **Select a Subject**:
   - Choose a subject from the left sidebar
   - Select specific topics or study all

2. **Answer Questions**:
   - Questions appear one at a time in the center
   - Submit your answer or skip to come back later
   - Incorrect questions are automatically re-queued

3. **Track Progress**:
   - View mastery percentage for each subject and topic
   - Toggle "Include Mastered" to review completed questions

4. **Import Custom Content**:
   - Use the Import tab in the right sidebar
   - Upload JSON files with subjects, questions, or full profiles
   - Import type is automatically detected
   - Imported data merges with existing content (updates existing, adds new)

## Development

### Setup

```bash
npm install
```

### Testing

```bash
npm test
```

Run tests with coverage report:

```bash
npm run test:coverage
```

### Linting

```bash
npm run lint
```

## Building

```bash
npm run build
```

The build files will be created in the `dist` directory.

## Project Structure

```
requizle/
├── src/
│   ├── components/       # React components
│   │   └── inputs/       # Question type input components
│   ├── context/          # React context providers
│   ├── store/            # Zustand state management
│   ├── test/             # Test setup
│   ├── utils/            # Utility functions
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Application entry point
│   ├── types.ts          # TypeScript type definitions
│   └── index.css         # Global styles
├── public/               # Static assets
├── .github/workflows/    # CI/CD configuration
└── dist/                 # Production build output
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Credits

- [React](https://react.dev/) - UI framework
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [Lucide](https://lucide.dev/) - Icons

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
