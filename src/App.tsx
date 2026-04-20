/*
 * ReQuizle - A spaced repetition study tool
 * Copyright (C) 2025 ReQuizle
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 */

import {ThemeProvider} from './context/ThemeContext';
import {AppRoutes} from './router';
import type {Subject} from './types';

// Sample data for initial load if empty
const SAMPLE_SUBJECTS: Subject[] = [
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
            choices: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlink Text Management Language'],
            answerIndex: 0,
            explanation: 'HTML stands for Hyper Text Markup Language, the standard markup language for web pages.'
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
            explanation: 'Yes, TypeScript adds static typing to JavaScript and compiles to plain JavaScript.'
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
            explanation: 'Using the power rule: \\(\\frac{d}{dx}x^n = nx^{n-1}\\), so \\(\\frac{d}{dx}x^3 = 3x^2\\)'
          },
          {
            id: 'q-latex-2',
            type: 'true_false',
            topicId: 'latex',
            prompt: 'The quadratic formula is \\(x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\)',
            answer: true,
            explanation: 'This is the correct quadratic formula used to solve equations of the form \\(ax^2 + bx + c = 0\\).'
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
            prompt: 'What is shown rotating in this video?',
            media: 'sample-video.mov',
            choices: ['The Moon', 'The Sun', 'Earth', 'Mars'],
            answerIndex: 2,
            explanation: 'The video shows Earth rotating, displaying our planet as seen from space.'
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
            explanation: 'The `length` property of an array returns the number of elements in it, which is `3`.'
          },
          {
            id: 'q-code-2',
            type: 'multiple_choice',
            topicId: 'code-blocks',
            prompt: 'Which CSS property is used here?\n```css\n.box {\n  display: flex;\n}\n```',
            choices: ['display', 'flex', 'box', 'None'],
            answerIndex: 0,
            explanation: '`display` is the CSS property being set to the value `flex`.'
          },
          {
            id: 'q-code-overflow',
            type: 'multiple_choice',
            topicId: 'code-blocks',
            prompt: 'Debugging Question: How does this overflow?\n```javascript\n// ' + 'A VERY LONG LINE '.repeat(20) + '\n// ' + 'ANOTHER VERY LONG LINE '.repeat(20) + '\n' + 'function dummy() { return null; }\n'.repeat(40) + '```',
            choices: ['It works fine', 'It looks bad', 'No idea', 'Help'],
            answerIndex: 0,
            explanation: 'Just a debug test.'
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
            prompt: 'Which of the following describes what the **ReQuizle** Markdown engine does best?\n\n> "The system efficiently balances the complexity of full Markdown parsers with the **absolute necessity** of *seamless* `inline math` and `code formatting`."\n\nTake your time to guess, if you need a hint, click this spoiler: ||It involves text rendering.|| Or check out [our Wikipedia](https://wikipedia.org) for more info!',
            choices: ['Parses all markdown perfectly', 'Supports __underlines__, ~~strikethroughs~~, and spoilers', 'Replaces React entirely', 'Compiles Code'],
            answerIndex: 1,
            explanation: 'Yes! It seamlessly parses custom tags like **bold**, *italic*, __underline__, ~~strikethrough~~, spoilers ||hidden||, [links](https://google.com), and blockquotes.'
          },
          {
            id: 'q-md-2',
            type: 'true_false',
            topicId: 'markdown-features',
            prompt: 'Does ReQuizle also support beautiful Markdown tables like this one?\n\n| Feature | Supported? | Coolness |\n|---------|------------|----------|\n| Tables | **Yes** | 100/100 |\n| Code | *Yes* | 90/100 |\n| Math | \\(x^2\\) | 99/100 |',
            answer: true,
            explanation: 'Yes! Our custom regex engine intelligently parses standard markdown tables and renders them beautifully with alternating styles and seamless inline element support inside the cells.'
          }
        ]
      }
    ]
  }
];

function App() {
  return (
    <ThemeProvider>
      <AppRoutes sampleSubjects={SAMPLE_SUBJECTS} />
    </ThemeProvider>
  );
}

export default App;
