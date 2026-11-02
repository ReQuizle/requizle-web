import type {Subject} from './types';

/** Seeded on first run when the store has no user subjects (see `sampleDataSeeded`). */
export const SAMPLE_SUBJECTS: Subject[] = [
    {
        id: 'feature-showcase',
        name: 'ReQuizle Features',
        topics: [
            {
                id: 'multiple-choice',
                name: 'Multiple Choice',
                questions: [
                    {
                        id: 'q-mc-1',
                        type: 'multiple_choice',
                        topicId: 'multiple-choice',
                        prompt: 'Which of these is a JavaScript framework?',
                        choices: ['Laravel', 'Django', 'React', 'Spring'],
                        answerIndex: 2,
                        explanation: 'React is a popular JavaScript library/framework for building user interfaces.'
                    },
                    {
                        id: 'q-mc-2',
                        type: 'multiple_choice',
                        topicId: 'multiple-choice',
                        prompt: 'What does HTML stand for?',
                        choices: [
                            'Hyper Text Markup Language',
                            'High Tech Modern Language',
                            'Home Tool Markup Language',
                            'Hyperlink Text Management Language'
                        ],
                        answerIndex: 0,
                        explanation:
                            'HTML stands for Hyper Text Markup Language, the standard markup language for web pages.'
                    }
                ]
            },
            {
                id: 'multiple-answer',
                name: 'Multiple Answer',
                questions: [
                    {
                        id: 'q-ma-1',
                        type: 'multiple_answer',
                        topicId: 'multiple-answer',
                        prompt: 'Select all prime numbers.',
                        choices: ['2', '4', '5', '9', '11'],
                        answerIndices: [0, 2, 4],
                        explanation: '2, 5, and 11 are prime. 4 and 9 are composite.'
                    },
                    {
                        id: 'q-ma-2',
                        type: 'multiple_answer',
                        topicId: 'multiple-answer',
                        prompt: 'Which of the following are valid CSS units?',
                        choices: ['px', 'em', 'kg', 'rem', 'mph'],
                        answerIndices: [0, 1, 3],
                        explanation: 'px, em, and rem are CSS units. kg and mph are not valid CSS units.'
                    }
                ]
            },
            {
                id: 'true-false',
                name: 'True or False',
                questions: [
                    {
                        id: 'q-tf-1',
                        type: 'true_false',
                        topicId: 'true-false',
                        prompt: 'TypeScript is a superset of JavaScript.',
                        answer: true,
                        explanation:
                            'Yes, TypeScript adds static typing to JavaScript and compiles to plain JavaScript.'
                    },
                    {
                        id: 'q-tf-2',
                        type: 'true_false',
                        topicId: 'true-false',
                        prompt: 'CSS stands for Computer Style Sheets.',
                        answer: false,
                        explanation: 'CSS stands for Cascading Style Sheets, not Computer Style Sheets.'
                    }
                ]
            },
            {
                id: 'keywords',
                name: 'Keywords (Short Answer)',
                questions: [
                    {
                        id: 'q-kw-1',
                        type: 'keywords',
                        topicId: 'keywords',
                        prompt: 'What is the capital of France?',
                        answer: 'Paris',
                        caseSensitive: false,
                        explanation: 'Paris is the capital city of France.'
                    },
                    {
                        id: 'q-kw-2',
                        type: 'keywords',
                        topicId: 'keywords',
                        prompt: 'What command is used to install packages in npm?',
                        answer: ['npm install', 'install', 'npm i'],
                        caseSensitive: false,
                        explanation: 'The "npm install" command (or "npm i" for short) is used to install packages.'
                    }
                ]
            },
            {
                id: 'matching',
                name: 'Matching',
                questions: [
                    {
                        id: 'q-match-1',
                        type: 'matching',
                        topicId: 'matching',
                        prompt: 'Match the programming language to its file extension.',
                        pairs: [
                            {left: 'Python', right: '.py'},
                            {left: 'JavaScript', right: '.js'},
                            {left: 'TypeScript', right: '.ts'},
                            {left: 'Java', right: '.java'}
                        ]
                    },
                    {
                        id: 'q-match-2',
                        type: 'matching',
                        topicId: 'matching',
                        prompt: 'Match the HTML tag to its purpose.',
                        pairs: [
                            {left: '<a>', right: 'Hyperlink'},
                            {left: '<p>', right: 'Paragraph'},
                            {left: '<img>', right: 'Image'},
                            {left: '<div>', right: 'Container'}
                        ]
                    }
                ]
            },
            {
                id: 'word-bank',
                name: 'Word Bank (Fill in the Blank)',
                questions: [
                    {
                        id: 'q-wb-1',
                        type: 'word_bank',
                        topicId: 'word-bank',
                        prompt: 'Complete the sentence about React.',
                        sentence: 'React uses a _ DOM to optimize _ updates.',
                        wordBank: ['virtual', 'real', 'rendering', 'network', 'database'],
                        answers: ['virtual', 'rendering']
                    },
                    {
                        id: 'q-wb-2',
                        type: 'word_bank',
                        topicId: 'word-bank',
                        prompt: 'Fill in the blanks about web development.',
                        sentence: '_ is used for structure, _ is used for styling, and _ is used for interactivity.',
                        wordBank: ['HTML', 'CSS', 'JavaScript', 'Python', 'SQL'],
                        answers: ['HTML', 'CSS', 'JavaScript']
                    }
                ]
            },
            {
                id: 'latex',
                name: 'LaTeX (Math)',
                questions: [
                    {
                        id: 'q-latex-1',
                        type: 'multiple_choice',
                        topicId: 'latex',
                        prompt: 'What is the derivative of \\(f(x) = x^3\\)?',
                        choices: ['\\(3x^2\\)', '\\(x^2\\)', '\\(3x\\)', '\\(x^3\\)'],
                        answerIndex: 0,
                        explanation:
                            'Using the power rule: \\(\\frac{d}{dx}x^n = nx^{n-1}\\), so \\(\\frac{d}{dx}x^3 = 3x^2\\)'
                    },
                    {
                        id: 'q-latex-2',
                        type: 'true_false',
                        topicId: 'latex',
                        prompt: 'The quadratic formula is \\(x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\)',
                        answer: true,
                        explanation:
                            'This is the correct quadratic formula used to solve equations of the form \\(ax^2 + bx + c = 0\\).'
                    }
                ]
            },
            {
                id: 'media',
                name: 'Media (Images & Video)',
                questions: [
                    {
                        id: 'q-media-1',
                        type: 'multiple_choice',
                        topicId: 'media',
                        prompt: 'What type of device does this icon represent?',
                        media: 'sample-image.svg',
                        choices: ['A microphone', 'Headphones', 'Speakers', 'A radio'],
                        answerIndex: 1,
                        explanation: 'The icon depicts headphones, a device used for listening to audio privately.'
                    },
                    {
                        id: 'q-media-2',
                        type: 'multiple_choice',
                        topicId: 'media',
                        prompt: 'Which shape is spinning in this video?',
                        media: 'sample-video.mp4',
                        choices: ['A circle', 'A triangle', 'A square', 'A star'],
                        answerIndex: 2,
                        explanation: 'The video shows a square making one full turn.'
                    },
                    {
                        id: 'q-media-3',
                        type: 'true_false',
                        topicId: 'media',
                        prompt: 'The icon above represents a pair of headphones.',
                        media: 'sample-image.svg',
                        answer: true,
                        explanation: 'The icon clearly depicts headphones with two ear cups connected by a headband.'
                    }
                ]
            },
            {
                id: 'code-blocks',
                name: 'Code Formatting',
                questions: [
                    {
                        id: 'q-code-1',
                        type: 'multiple_choice',
                        topicId: 'code-blocks',
                        prompt: 'What does the following JavaScript code output?\n```javascript\nconst arr = [1, 2, 3];\nconsole.log(arr.length);\n```',
                        choices: ['1', '2', '3', 'undefined'],
                        answerIndex: 2,
                        explanation:
                            'The `length` property of an array returns the number of elements in it, which is `3`.'
                    },
                    {
                        id: 'q-code-2',
                        type: 'multiple_choice',
                        topicId: 'code-blocks',
                        prompt: 'Which CSS property is used here?\n```css\n.box {\n  display: flex;\n}\n```',
                        choices: ['display', 'flex', 'box', 'None'],
                        answerIndex: 0,
                        explanation: '`display` is the CSS property being set to the value `flex`.'
                    }
                ]
            },
            {
                id: 'markdown-features',
                name: 'Markdown & Rich Text',
                questions: [
                    {
                        id: 'q-md-1',
                        type: 'multiple_choice',
                        topicId: 'markdown-features',
                        prompt: 'Which of these can **ReQuizle** questions use?\n\n> "Questions can mix **bold**, *italic*, `inline code`, and math such as \\(x^2\\)."\n\nNeed a hint? Click this spoiler: ||It is about text styles.|| The [wiki](https://requizle.github.io/requizle-wiki/) lists every option.',
                        choices: [
                            'Every Markdown feature',
                            '__Underline__, ~~strikethrough~~, and spoilers',
                            'Embedded web pages',
                            'Code that runs'
                        ],
                        answerIndex: 1,
                        explanation:
                            'Along with **bold** and *italic*, questions can use __underline__, ~~strikethrough~~, spoilers like ||this one||, [links](https://requizle.github.io/requizle-wiki/), and block quotes.'
                    },
                    {
                        id: 'q-md-2',
                        type: 'true_false',
                        topicId: 'markdown-features',
                        prompt: 'ReQuizle can show Markdown tables like this one.\n\n| Feature | Supported | Example |\n|---------|-----------|---------|\n| Tables | **Yes** | This table |\n| Code | *Yes* | `const x = 1` |\n| Math | Yes | \\(x^2\\) |',
                        answer: true,
                        explanation:
                            'Tables use the standard Markdown syntax, and their cells can hold the same formatting as the rest of the question.'
                    }
                ]
            }
        ]
    }
];
