import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import TeacherRoute from "./components/TeacherRoute.jsx";
import Layout from "./components/Layout.jsx";

import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import Rating from "./pages/Rating.jsx";
import Stats from "./pages/Stats.jsx";
import AddResult from "./pages/AddResult.jsx";
import AdminApprovals from "./pages/AdminApprovals.jsx";
import AdminTypes from "./pages/AdminTypes.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminTeacher from "./pages/AdminTeacher.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Profile />} />
        <Route path="rating" element={<Rating />} />
        <Route path="stats" element={<Stats />} />
        <Route path="add" element={<TeacherRoute><AddResult /></TeacherRoute>} />

        <Route path="admin/approvals" element={<AdminRoute><AdminApprovals /></AdminRoute>} />
        <Route path="admin/types" element={<AdminRoute><AdminTypes /></AdminRoute>} />
        <Route path="admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="admin/teacher/:uid" element={<AdminRoute><AdminTeacher /></AdminRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
