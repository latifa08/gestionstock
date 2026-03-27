import React from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar({ toggleDarkMode, darkMode }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user"); // 🧹 حذف session
    navigate("/login"); // 🚀 رجوع للوغين
  };

  return (
    <div className="navbar">
      
      <div className="nav-logo">SysStock</div>

      <div className="nav-actions">

        {/* 🌙 Dark Mode */}
        <div className="mode-toggle">
          <button onClick={toggleDarkMode}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </div>

        {/* 🚪 Logout */}
        <div className="logout">
          <button onClick={handleLogout}>
            Logout
          </button>
        </div>

      </div>

    </div>
  );
}