import {Component} from 'react';
import type {ErrorInfo, ReactNode} from 'react';
import {AlertCircle, RotateCcw, FastForward} from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallbackMessage?: string;
    onReset?: () => void;
    onSkip?: () => void;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return {hasError: true, error};
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({hasError: false, error: undefined});
        if (this.props.onReset) {
            this.props.onReset();
        }
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Something went wrong</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                        {this.props.fallbackMessage || "The application encountered an error while rendering this content."}
                    </p>
                    <div className="text-xs font-mono bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 p-3 rounded-md w-full mb-6 overflow-x-auto text-left">
                        {this.state.error?.message || "Unknown Error"}
                    </div>

                    <div className="flex gap-3 justify-center w-full">
                        <button
                            onClick={this.handleReset}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <RotateCcw size={18} />
                            Try Again
                        </button>

                        {this.props.onSkip && (
                            <button
                                onClick={this.props.onSkip}
                                className="btn-primary flex items-center gap-2"
                            >
                                <FastForward size={18} />
                                Skip Question
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
