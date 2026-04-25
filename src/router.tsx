import {BrowserRouter, Route, Routes} from 'react-router-dom';
import {lazy, Suspense, useEffect} from 'react';
import {Layout} from './components/Layout';
import {useQuizStore} from './store/useQuizStore';
import type {Subject} from './types';

const LeftSidebar = lazy(() =>
    import('./components/LeftSidebar').then(module => ({default: module.LeftSidebar}))
);
const CenterArea = lazy(() =>
    import('./components/CenterArea').then(module => ({default: module.CenterArea}))
);
const RightSidebar = lazy(() =>
    import('./components/RightSidebar').then(module => ({default: module.RightSidebar}))
);
const EditorPage = lazy(() =>
    import('./pages/EditorPage').then(module => ({default: module.EditorPage}))
);
const NotFoundPage = lazy(() =>
    import('./pages/NotFoundPage').then(module => ({default: module.NotFoundPage}))
);

type StudyShellProps = {
    sampleSubjects: Subject[];
};

const sidebarLoadingFallback = (
    <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading panel...</div>
);

const pageLoadingFallback = (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />
);

function StudyShell({sampleSubjects}: StudyShellProps) {
    const {profiles, activeProfileId, settings, setSubjects, markSampleDataSeeded} = useQuizStore();
    const subjects = profiles[activeProfileId]?.subjects || [];

    useEffect(() => {
        if (!settings.sampleDataSeeded && subjects.length === 0) {
            const baseUrl = window.location.origin + import.meta.env.BASE_URL;
            const subjectsWithAbsoluteMedia = sampleSubjects.map(subject => ({
                ...subject,
                topics: subject.topics.map(topic => ({
                    ...topic,
                    questions: topic.questions.map(question => ({
                        ...question,
                        media: question.media ? baseUrl + question.media : undefined
                    }))
                }))
            }));
            setSubjects(subjectsWithAbsoluteMedia);
            markSampleDataSeeded();
        }
    }, [markSampleDataSeeded, sampleSubjects, setSubjects, settings.sampleDataSeeded, subjects.length]);

    return (
        <Layout
            leftSidebar={
                <Suspense fallback={sidebarLoadingFallback}>
                    <LeftSidebar />
                </Suspense>
            }
            center={
                <Suspense fallback={pageLoadingFallback}>
                    <CenterArea />
                </Suspense>
            }
            rightSidebar={
                <Suspense fallback={sidebarLoadingFallback}>
                    <RightSidebar />
                </Suspense>
            }
        />
    );
}

type AppRoutesProps = {
    sampleSubjects: Subject[];
};

export function AppRoutes({sampleSubjects}: AppRoutesProps) {
    const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
    return (
        <BrowserRouter basename={basename}>
            <Routes>
                <Route path="/" element={<StudyShell sampleSubjects={sampleSubjects} />} />
                <Route
                    path="/edit"
                    element={
                        <Suspense fallback={pageLoadingFallback}>
                            <EditorPage />
                        </Suspense>
                    }
                />
                <Route
                    path="*"
                    element={
                        <Suspense fallback={pageLoadingFallback}>
                            <NotFoundPage />
                        </Suspense>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}
