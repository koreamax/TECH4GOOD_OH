import { Route, Routes } from 'react-router-dom';

import TabBar from './components/TabBar';
import CourseDetailPage from './pages/CourseDetailPage';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import MyPage from './pages/MyPage';
import RecordDetailPage from './pages/RecordDetailPage';
import RecordsPage from './pages/RecordsPage';
import ReportsPage from './pages/ReportsPage';
import SummaryPage from './pages/SummaryPage';
import WalkPage from './pages/WalkPage';

export default function App() {
  return (
    <div className="frame">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/my" element={<MyPage />} />
        <Route path="/walk" element={<WalkPage />} />
        <Route path="/summary" element={<SummaryPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/records/:id" element={<RecordDetailPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
      </Routes>
      <TabBar />
    </div>
  );
}
