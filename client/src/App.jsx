import {Routes, Route, Navigate} from 'react-router-dom';
import {useEffect} from 'react';
import {useDispatch} from 'react-redux';
import {fetchMe} from './store/slices/authSlice.js';

import Navbar from './components/layout/Navbar.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import RoleRoute from './components/layout/RoleRoute.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import VerifyOTP from './pages/auth/VerifyOTP.jsx';
import ContestList from './pages/contests/ContestList.jsx';
import ContestDetail from './pages/contests/ContestDetail.jsx';
import ContestArena from './pages/contests/ContestArena.jsx';
import UserDashboard from './pages/dashboard/UserDashboard.jsx';
import OrganizerDashboard from './pages/dashboard/OrganizerDashboard.jsx';
import AdminPanel from './pages/admin/AdminPanel.jsx';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) dispatch(fetchMe());
  }, []);

  return (
    <div className="min-h-screen bg-base">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/contests" element={<ContestList />} />
        <Route path="/contests/:slug" element={<ContestDetail />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/arena/:contestId" element={<ContestArena />} />
          <Route path="/dashboard" element={<UserDashboard />} />
        </Route>

        <Route element={<RoleRoute roles={['organizer', 'admin']} />}>
          <Route path="/organizer" element={<OrganizerDashboard />} />
        </Route>

        <Route element={<RoleRoute roles={['admin']} />}>
          <Route path="/admin" element={<AdminPanel />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
