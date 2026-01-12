import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function TeacherRoute({ children }) {
  const { user, loading, role } = useAuth();
  if (loading) return <div className="container"><div className="card">Загрузка...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role === "admin") return <Navigate to="/admin/approvals" replace />;
  return children;
}
