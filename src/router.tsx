import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom';
import {useEffect} from 'react';
import {Layout} from './components/Layout';
import {LeftSidebar} from './components/LeftSidebar';
import {CenterArea} from './components/CenterArea';
import {RightSidebar} from './components/RightSidebar';
import {EditorPage} from './pages/EditorPage';
import {useQuizStore} from './store/useQuizStore';
import type {Subject} from './types';

type StudyShellProps = {
    sampleSubjects: Subject[];
};

function StudyShell({sampleSubjects}: StudyShellProps) {
    const {profiles, activeProfileId, setSubjects} = useQuizStore();
    const subjects = profiles[activeProfileId]?.subjects || [];

    useEffect(() => {
        if (subjects.length === 0) {
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
        }
    }, [subjects.length, setSubjects, sampleSubjects]);

    return (
        <Layout leftSidebar={<LeftSidebar />} center={<CenterArea />} rightSidebar={<RightSidebar />} />
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
                <Route path="/edit" element={<EditorPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
