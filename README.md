# ReQuizle

[![CI](https://github.com/ReQuizle/requizle-web/actions/workflows/ci.yml/badge.svg)](https://github.com/ReQuizle/requizle-web/actions/workflows/ci.yml)

<img src="public/icon.svg" alt="ReQuizle Logo" width="250">

ReQuizle is a modern web application designed to help users study efficiently through spaced repetition and active recall.

## Features

- **Focused Study Experience**: Clean, distraction-free UI with smooth animations.
- **Mastery Tracking**: Track progress and mastery percentage for each subject and topic.
- **Spaced Repetition**: Option to include or exclude mastered questions from the study queue.
- **Multiple Question Types**: Multiple Choice, Matching, Word Bank, Keywords, and more.
- **Privacy-Focused**: All data is stored locally in your browser (IndexedDB). No servers, no tracking.
- **Rich Media**: Supports images, videos, and LaTeX equations.

## Documentation

For full guides, file formats, and development instructions, please visit the **[Official Documentation](https://requizle.github.io/requizle-wiki/)**.

- [User Guide](https://requizle.github.io/requizle-wiki/guide)
- [Import/Export & File Formats](https://requizle.github.io/requizle-wiki/import-export)
- [Development Guide](https://requizle.github.io/requizle-wiki/development)

## Quick Start

### Installation

```bash
git clone https://github.com/ReQuizle/requizle-web.git
cd requizle-web
npm install
```

### Usage

```bash
npm run dev
```

1. **Select a Subject**: Choose a subject from the left sidebar.
2. **Answer Questions**: Questions appear one at a time.
3. **Track Progress**: View mastery percentage for each subject.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
