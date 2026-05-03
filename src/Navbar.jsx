import React from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar({ toggleDarkMode, darkMode }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="navbar">
      <div className="nav-logo">SysStock</div>

      <div className="nav-actions">

        <button onClick={toggleDarkMode}>
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>

        <button onClick={handleLogout}>
          Logout
        </button>

      </div>
    </div>
  );
}