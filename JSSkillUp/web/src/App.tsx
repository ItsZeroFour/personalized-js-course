import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { RoadmapPage } from '@/pages/RoadmapPage';
import { TopicLayout } from '@/pages/topic/TopicLayout';
import { TopicOverview } from '@/pages/topic/TopicOverview';
import { TopicTheory } from '@/pages/topic/TopicTheory';
import { TopicQuiz } from '@/pages/topic/TopicQuiz';
import { TopicCards } from '@/pages/topic/TopicCards';
import { CardsPage } from '@/pages/CardsPage';
import { TasksPage } from '@/pages/TasksPage';
import { InterviewPage } from '@/pages/InterviewPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { Loading } from '@/components/ui/States';

// Страница задачи тянет Monaco (несколько мегабайт) — грузим её отдельным чанком.
const TaskPage = lazy(() => import('@/pages/TaskPage').then((m) => ({ default: m.TaskPage })));
// Сессия интервью тоже содержит Monaco — для live-coding.
const InterviewSessionPage = lazy(() =>
  import('@/pages/InterviewSessionPage').then((m) => ({ default: m.InterviewSessionPage })),
);

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="roadmap" element={<RoadmapPage />} />
        <Route path="topic/:slug" element={<TopicLayout />}>
          <Route index element={<TopicOverview />} />
          <Route path="theory" element={<TopicTheory />} />
          <Route path="quiz" element={<TopicQuiz />} />
          <Route path="cards" element={<TopicCards />} />
        </Route>
        <Route path="cards" element={<CardsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route
          path="tasks/:slug"
          element={
            <Suspense fallback={<Loading label="Загружаем редактор" />}>
              <TaskPage />
            </Suspense>
          }
        />
        <Route path="interview" element={<InterviewPage />} />
        <Route
          path="interview/:id"
          element={
            <Suspense fallback={<Loading label="Загружаем интервью" />}>
              <InterviewSessionPage />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
