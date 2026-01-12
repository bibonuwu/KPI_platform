import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { profile, role, logout } = useAuth();

  return (
    <>
      <div className="nav">
        <div className="navInner">
          <div className="brand">
            <strong>Teacher Rating</strong>
            <span className="badge">{role ?? "..."}</span>
          </div>

          <div className="navLinks">
            <NavLink to="/" className={({isActive}) => "navLink" + (isActive ? " active" : "")}>Профиль</NavLink>
            <NavLink to="/rating" className={({isActive}) => "navLink" + (isActive ? " active" : "")}>Рейтинг</NavLink>
            <NavLink to="/stats" className={({isActive}) => "navLink" + (isActive ? " active" : "")}>Статистика</NavLink>
            {role !== "admin" && (
              <NavLink to="/add" className={({isActive}) => "navLink" + (isActive ? " active" : "")}>Добавить результат</NavLink>
            )}

            {role === "admin" && (
              <>
                <NavLink to="/admin/approvals" className={({isActive}) => "navLink" + (isActive ? " active" : "")}>Админ: заявки</NavLink>
                <NavLink to="/admin/types" className={({isActive}) => "navLink" + (isActive ? " active" : "")}>Админ: типы</NavLink>
                <NavLink to="/admin/users" className={({isActive}) => "navLink" + (isActive ? " active" : "")}>Админ: учителя</NavLink>
              </>
            )}
          </div>

          <div className="navRight">
            <small className="muted" style={{maxWidth: 220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
              {profile?.email}
            </small>
            <button className="btn secondary" onClick={logout}>Выйти</button>
          </div>
        </div>
      </div>

      <Outlet />
    </>
  );
}
