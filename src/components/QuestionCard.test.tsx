import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {QuestionCard} from './QuestionCard';
import {useQuizStore} from '../store/useQuizStore';

// Mock the store
vi.mock('../store/useQuizStore', () => ({
    useQuizStore: vi.fn()
}));

// Mock mediaStorage
const mockGetMedia = vi.fn();
vi.mock('../utils/mediaStorage', () => ({
    getMedia: (...args: unknown[]) => mockGetMedia(...args),
    isIndexedDBMedia: (ref: string) => ref.startsWith('idb:'),
    extractMediaId: (ref: string) => ref.replace('idb:', ''),
    createMediaObjectUrl: () => 'blob:mock-media',
    revokeMediaObjectUrl: vi.fn()
}));

// Mock Latex component
vi.mock('./Latex', () => ({
    Latex: ({children}: {children: string}) => <span>{children}</span>
}));

// Mock sub-components to simplify testing
vi.mock('./inputs/MultipleChoiceInput', () => ({
    MultipleChoiceInput: ({onAnswer, disabled}: {onAnswer: (answer: number) => void; disabled?: boolean}) => (
        <button onClick={() => onAnswer(0)} disabled={disabled}>
            Select Option A
        </button>
    )
}));

vi.mock('./inputs/TrueFalseInput', () => ({
    TrueFalseInput: ({onAnswer, disabled}: {onAnswer: (answer: boolean) => void; disabled?: boolean}) => (
        <div>
            <button onClick={() => onAnswer(true)} disabled={disabled}>Select True</button>
            <button onClick={() => onAnswer(false)} disabled={disabled}>Select False</button>
        </div>
    )
}));

vi.mock('./inputs/MultipleAnswerInput', () => ({
    MultipleAnswerInput: ({onAnswer}: {onAnswer: (answer: number[]) => void}) => (
        <button onClick={() => onAnswer([0, 2])}>Submit MA</button>
    )
}));

vi.mock('./inputs/KeywordsInput', () => ({
    KeywordsInput: ({onAnswer}: {onAnswer: (answer: string) => void}) => (
        <button onClick={() => onAnswer('Paris')}>Submit KW</button>
    )
}));

vi.mock('./inputs/MatchingInput', () => ({
    MatchingInput: ({onAnswer}: {onAnswer: (answer: Record<string, string>) => void}) => (
        <button onClick={() => onAnswer({'A': '1'})}>Submit Match</button>
    )
}));

vi.mock('./inputs/WordBankInput', () => ({
    WordBankInput: ({onAnswer}: {onAnswer: (answer: string[]) => void}) => (
        <button onClick={() => onAnswer(['sky', 'blue'])}>Submit Word Bank</button>
    )
}));

// Mock confetti
vi.mock('canvas-confetti', () => ({
    default: vi.fn()
}));

describe('QuestionCard', () => {
    const mockSubmitAnswer = vi.fn();
    const mockSkipQuestion = vi.fn();
    const mockNextQuestion = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('URL', {
            ...URL,
            createObjectURL: vi.fn(() => 'blob:mock-media'),
            revokeObjectURL: vi.fn()
        });
        (useQuizStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            submitAnswer: mockSubmitAnswer,
            skipQuestion: mockSkipQuestion,
            nextQuestion: mockNextQuestion
        });
    });

    describe('rendering', () => {
        it('should render question prompt', () => {
            const question = {
                id: '1',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'What is the capital of France?',
                choices: ['Paris', 'London'],
                answerIndex: 0,
                explanation: ''
            };

            render(<QuestionCard question={question} />);
            expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
        });

        it('should render question type badge', () => {
            const question = {
                id: '1',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: ''
            };

            render(<QuestionCard question={question} />);
            expect(screen.getByText('MULTIPLE CHOICE')).toBeInTheDocument();
        });

        it('should render skip button', () => {
            const question = {
                id: '1',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: ''
            };

            render(<QuestionCard question={question} />);
            expect(screen.getByText('Skip')).toBeInTheDocument();
        });
    });

    describe('multiple_choice questions', () => {
        it('should handle correct answer submission', () => {
            const question = {
                id: '1',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: ''
            };

            mockSubmitAnswer.mockReturnValue({correct: true});

            render(<QuestionCard question={question} />);
            fireEvent.click(screen.getByText('Select Option A'));

            expect(mockSubmitAnswer).toHaveBeenCalledWith(0);
            expect(screen.getByText('Correct!')).toBeInTheDocument();
        });

        it('should handle incorrect answer and show correct answer', () => {
            const question = {
                id: '1',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 1,
                explanation: 'The correct answer is B'
            };

            mockSubmitAnswer.mockReturnValue({correct: false, explanation: 'The correct answer is B'});

            render(<QuestionCard question={question} />);
            fireEvent.click(screen.getByText('Select Option A'));

            expect(screen.getByText('Not quite right')).toBeInTheDocument();
            expect(screen.getByText('The correct answer is B')).toBeInTheDocument();
            expect(screen.getByText('Correct Answer:')).toBeInTheDocument();
        });
    });

    describe('true_false questions', () => {
        it('should render true/false input for true_false questions', () => {
            const question = {
                id: '2',
                topicId: 't1',
                type: 'true_false' as const,
                prompt: 'The sky is blue.',
                answer: true,
                explanation: ''
            };

            render(<QuestionCard question={question} />);
            expect(screen.getByText('Select True')).toBeInTheDocument();
            expect(screen.getByText('Select False')).toBeInTheDocument();
        });

        it('should handle true_false answer submission', () => {
            const question = {
                id: '2',
                topicId: 't1',
                type: 'true_false' as const,
                prompt: 'The sky is blue.',
                answer: true,
                explanation: ''
            };

            mockSubmitAnswer.mockReturnValue({correct: true});

            render(<QuestionCard question={question} />);
            fireEvent.click(screen.getByText('Select True'));

            expect(mockSubmitAnswer).toHaveBeenCalledWith(true);
            expect(screen.getByText('Correct!')).toBeInTheDocument();
        });
    });

    describe('multiple_answer questions', () => {
        it('should render multiple answer input', () => {
            const question = {
                id: '3',
                topicId: 't1',
                type: 'multiple_answer' as const,
                prompt: 'Select all fruits',
                choices: ['Apple', 'Car', 'Banana'],
                answerIndices: [0, 2],
                explanation: ''
            };

            render(<QuestionCard question={question} />);
            expect(screen.getByText('Submit MA')).toBeInTheDocument();
        });
    });

    describe('keywords questions', () => {
        it('should render keywords input', () => {
            const question = {
                id: '4',
                topicId: 't1',
                type: 'keywords' as const,
                prompt: 'What is the capital of France?',
                answer: 'Paris',
                explanation: ''
            };

            render(<QuestionCard question={question} />);
            expect(screen.getByText('Submit KW')).toBeInTheDocument();
        });
    });

    describe('matching questions', () => {
        it('should render matching input', () => {
            const question = {
                id: '5',
                topicId: 't1',
                type: 'matching' as const,
                prompt: 'Match the items',
                pairs: [{left: 'A', right: '1'}],
                explanation: ''
            };

            render(<QuestionCard question={question} />);
            expect(screen.getByText('Submit Match')).toBeInTheDocument();
        });
    });

    describe('word_bank questions', () => {
        it('should render word bank input', () => {
            const question = {
                id: '6',
                topicId: 't1',
                type: 'word_bank' as const,
                prompt: 'Fill in the blanks',
                sentence: 'The _ is _',
                wordBank: ['sky', 'blue'],
                answers: ['sky', 'blue'],
                explanation: ''
            };

            render(<QuestionCard question={question} />);
            expect(screen.getByText('Submit Word Bank')).toBeInTheDocument();
        });
    });

    describe('skip functionality', () => {
        it('should call skipQuestion when skip button is clicked', () => {
            const question = {
                id: '1',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: ''
            };

            render(<QuestionCard question={question} />);
            fireEvent.click(screen.getByText('Skip'));

            expect(mockSkipQuestion).toHaveBeenCalled();
        });

        it('hides skip and disables input after submitting option index 0', () => {
            const question = {
                id: '1',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: ''
            };
            mockSubmitAnswer.mockReturnValue({correct: true});

            render(<QuestionCard question={question} />);
            fireEvent.click(screen.getByText('Select Option A'));

            expect(screen.queryByText('Skip')).not.toBeInTheDocument();
            expect(screen.getByText('Select Option A')).toBeDisabled();
        });

        it('hides skip and disables inputs after submitting false', () => {
            const question = {
                id: '2',
                topicId: 't1',
                type: 'true_false' as const,
                prompt: 'The sky is blue.',
                answer: true,
                explanation: ''
            };
            mockSubmitAnswer.mockReturnValue({correct: false});

            render(<QuestionCard question={question} />);
            fireEvent.click(screen.getByText('Select False'));

            expect(screen.queryByText('Skip')).not.toBeInTheDocument();
            expect(screen.getByText('Select True')).toBeDisabled();
            expect(screen.getByText('Select False')).toBeDisabled();
        });

        it('resets submitted state when question changes', async () => {
            const baseQuestion = {
                topicId: 't1',
                type: 'multiple_choice' as const,
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: ''
            };
            mockSubmitAnswer.mockReturnValue({correct: true});

            const {rerender} = render(
                <QuestionCard question={{...baseQuestion, id: 'q1', prompt: 'Q1'}} />
            );
            fireEvent.click(screen.getByText('Select Option A'));
            expect(screen.queryByText('Skip')).not.toBeInTheDocument();

            rerender(<QuestionCard question={{...baseQuestion, id: 'q2', prompt: 'Q2'}} />);
            await waitFor(() => {
                expect(screen.queryByText('Correct!')).not.toBeInTheDocument();
            });
            expect(screen.getByText('Select Option A')).not.toBeDisabled();
        });
    });

    describe('continue to next question', () => {
        it('should show continue button after answering', () => {
            const question = {
                id: '1',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: ''
            };

            mockSubmitAnswer.mockReturnValue({correct: true});

            render(<QuestionCard question={question} />);
            fireEvent.click(screen.getByText('Select Option A'));

            expect(screen.getByText(/Continue/)).toBeInTheDocument();
        });

        it('should call nextQuestion when continue is clicked', () => {
            const question = {
                id: '1',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: ''
            };

            mockSubmitAnswer.mockReturnValue({correct: true});

            render(<QuestionCard question={question} />);
            fireEvent.click(screen.getByText('Select Option A'));
            fireEvent.click(screen.getByText(/Continue/));

            expect(mockNextQuestion).toHaveBeenCalled();
        });
    });

    describe('media rendering', () => {
        it('should render image when media is an image URL', async () => {
            const question = {
                id: '1',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: '',
                media: 'https://example.com/image.png'
            };

            render(<QuestionCard question={question} />);

            await waitFor(() => {
                const img = document.querySelector('img');
                expect(img).toBeInTheDocument();
                expect(img).toHaveAttribute('src', 'https://example.com/image.png');
            });
        });

        it('should render video when media is a video URL', async () => {
            const question = {
                id: '2',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: '',
                media: 'https://example.com/video.mp4'
            };

            render(<QuestionCard question={question} />);

            await waitFor(() => {
                const video = document.querySelector('video');
                expect(video).toBeInTheDocument();
                expect(video).toHaveAttribute('src', 'https://example.com/video.mp4');
            });
        });

        it('should render image when media is a data URI image', async () => {
            const question = {
                id: '3',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: '',
                media: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
            };

            render(<QuestionCard question={question} />);

            await waitFor(() => {
                const img = document.querySelector('img');
                expect(img).toBeInTheDocument();
            });
        });

        it('should render video when media is a data URI video', async () => {
            const question = {
                id: '4',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: '',
                media: 'data:video/mp4;base64,AAAAHGZ0eXBpc29t'
            };

            render(<QuestionCard question={question} />);

            await waitFor(() => {
                const video = document.querySelector('video');
                expect(video).toBeInTheDocument();
            });
        });

        it('should load media from IndexedDB when using idb: reference', async () => {
            mockGetMedia.mockResolvedValue({
                id: 'media-123',
                blob: new Blob(['test'], {type: 'image/png'}),
                filename: 'test.png',
                mimeType: 'image/png',
                size: 100,
                createdAt: Date.now()
            });

            const question = {
                id: '5',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: '',
                media: 'idb:media-123'
            };

            render(<QuestionCard question={question} />);

            await waitFor(() => {
                expect(mockGetMedia).toHaveBeenCalledWith('media-123');
                const img = document.querySelector('img');
                expect(img).toBeInTheDocument();
            });
        });

        it('should show error message when IndexedDB media fails to load', async () => {
            mockGetMedia.mockResolvedValue(null);

            const question = {
                id: '6',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: '',
                media: 'idb:non-existent'
            };

            render(<QuestionCard question={question} />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load media')).toBeInTheDocument();
            }, {timeout: 3000});
        });

        it('should not render media section when no media is present', () => {
            const question = {
                id: '7',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: ''
                // No media field
            };

            render(<QuestionCard question={question} />);

            expect(document.querySelector('img')).not.toBeInTheDocument();
            expect(document.querySelector('video')).not.toBeInTheDocument();
        });

        it('should update media state when switching from idb media to direct URL', async () => {
            mockGetMedia.mockResolvedValue({
                id: 'media-123',
                blob: new Blob(['test'], {type: 'image/png'}),
                filename: 'test.png',
                mimeType: 'image/png',
                size: 100,
                createdAt: Date.now()
            });

            const baseQuestion = {
                id: '8',
                topicId: 't1',
                type: 'multiple_choice' as const,
                prompt: 'Q1',
                choices: ['A', 'B'],
                answerIndex: 0,
                explanation: ''
            };

            const {rerender} = render(<QuestionCard question={{...baseQuestion, media: 'idb:media-123'}} />);

            await waitFor(() => {
                expect(mockGetMedia).toHaveBeenCalledWith('media-123');
                const img = document.querySelector('img');
                expect(img).toBeInTheDocument();
                expect(img).toHaveAttribute('src', 'blob:mock-media');
            });

            rerender(<QuestionCard question={{...baseQuestion, media: 'https://example.com/new-image.png'}} />);

            await waitFor(() => {
                const img = document.querySelector('img');
                expect(img).toBeInTheDocument();
                expect(img).toHaveAttribute('src', 'https://example.com/new-image.png');
            });

            expect(screen.queryByText('Loading media...')).not.toBeInTheDocument();
            expect(screen.queryByText('Failed to load media')).not.toBeInTheDocument();
        });
    });
});
