import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({ darkMode }) {
  const location = useLocation();

  // ❌ ما نعرضوش في login
  if (location.pathname === "/login") return null;

  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  return (
    <div className={`sidebar ${darkMode ? "dark-mode" : ""}`}>
      <h2 className="logo">SysStock</h2>

      <ul>

        {/* 👑 ADMIN = كلشي */}
        {role === "admin" && (
          <>
            <li><NavLink to="/dashboard" className="link">🏠 Dashboard</NavLink></li>
            <li><NavLink to="/admin" className="link">👑 Admin</NavLink></li>
            <li><NavLink to="/clients" className="link">👥 Clients</NavLink></li>
            <li><NavLink to="/fournisseurs" className="link">🚚 Fournisseurs</NavLink></li>
            <li><NavLink to="/products" className="link">📦 Produits</NavLink></li>
            <li><NavLink to="/mouvement" className="link">🔄 Mouvement</NavLink></li>
            <li><NavLink to="/facture" className="link">📄 Facture</NavLink></li>
            <li><NavLink to="/stockalert" className="link">⚠️ Stock Alert</NavLink></li>
            <li><NavLink to="/barcode" className="link">🖨 Barcode</NavLink></li>
            <li><NavLink to="/rapportstock" className="link">📊 Rapport Stock</NavLink></li>
            <li><NavLink to="/Chatbot" className="link">🤖 Chatbot</NavLink></li>
          </>
        )}

        {/* 👨‍💼 RESPONSABLE */}
        {role === "responsable" && (
          <>
            <li><NavLink to="/dashboard" className="link">🏠 Dashboard</NavLink></li>
            <li><NavLink to="/rapportstock" className="link">📊 Rapport Stock</NavLink></li>
            <li><NavLink to="/stockalert" className="link">⚠️ Stock Alert</NavLink></li>
            <li><NavLink to="/clients" className="link">👥 Clients</NavLink></li>
            <li><NavLink to="/fournisseurs" className="link">🚚 Fournisseurs</NavLink></li>
            <li><NavLink to="/facture" className="link">📄 Facture</NavLink></li>
            <li><NavLink to="/Chatbot" className="link">🤖 Chatbot</NavLink></li>
          </>
        )}

        {/* 🏭 MAGASINIER */}
        {role === "magasinier" && (
          <>
            <li><NavLink to="/products" className="link">📦 Produits</NavLink></li>
            <li><NavLink to="/mouvement" className="link">🔄 Mouvement</NavLink></li>
            <li><NavLink to="/facture" className="link">📄 Facture</NavLink></li>
            <li><NavLink to="/stockalert" className="link">⚠️ Stock Alert</NavLink></li>
            <li><NavLink to="/barcode" className="link">🖨 Barcode</NavLink></li>
            <li><NavLink to="/Chatbot" className="link">🤖 Chatbot</NavLink></li>
          </>
        )}

      </ul>
    </div>
  );
}