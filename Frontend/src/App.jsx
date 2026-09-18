import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Savings from './pages/Savings.jsx';
import Loans from './pages/Loans.jsx';
import Members from './pages/Members.jsx';
import Meetings from './pages/Meetings.jsx';
import Welfare from './pages/Welfare.jsx';
import Fines from './pages/Fines.jsx';
import ShareOut from './pages/ShareOut.jsx';
import JoinRequests from './pages/JoinRequests.jsx';
import Messages from './pages/Messages.jsx';
import Cycles from './pages/Cycles.jsx';
import Activity from './pages/Activity.jsx';
import Settings from './pages/Settings.jsx';
import Profile from './pages/Profile.jsx';
import NotFound from './pages/NotFound.jsx';
import './App.css';

const COMMITTEE = ['admin', 'treasurer', 'secretary'];
const EVERYONE = ['admin', 'treasurer', 'secretary', 'member'];

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Everything behind a log-in */}
      <Route
        path="/app"
        element={<ProtectedRoute><Layout /></ProtectedRoute>}
      >
        <Route index element={<Dashboard />} />
        <Route path="savings"  element={<ProtectedRoute roles={COMMITTEE}><Savings /></ProtectedRoute>} />
        <Route path="loans"    element={<Loans />} />
        <Route path="members"  element={<ProtectedRoute roles={COMMITTEE}><Members /></ProtectedRoute>} />
        <Route path="meetings" element={<Meetings />} />
        <Route path="welfare"  element={<Welfare />} />
        <Route path="fines"    element={<Fines />} />
        <Route path="shareout" element={<ShareOut />} />
        <Route path="requests" element={<JoinRequests />} />
        <Route path="messages" element={<ProtectedRoute roles={COMMITTEE}><Messages /></ProtectedRoute>} />
        <Route path="cycles"   element={<ProtectedRoute roles={['admin']}><Cycles /></ProtectedRoute>} />
        <Route path="activity" element={<ProtectedRoute roles={COMMITTEE}><Activity /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute roles={COMMITTEE}><Settings /></ProtectedRoute>} />
        <Route path="profile"  element={<ProtectedRoute roles={EVERYONE}><Profile /></ProtectedRoute>} />
      </Route>

      {/* Old links from the HTML version */}
      <Route path="/dashboard" element={<Navigate to="/app" replace />} />
      <Route path="/index.html" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
