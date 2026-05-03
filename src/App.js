import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import Dashboard from "./Dashboard";
import Admin from "./Admin";
import Clients from "./Clients";
import Fournisseurs from "./Fournisseurs";
import Products from "./Products";
import MouvementPage from "./MouvementPage";
import Facture from "./Facture";
import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import BarcodePage from "./BarcodePage";
import RapportStock from "./RapportStock";
import StockAlert from "./StockAlert";
import Chatbot from "./Chatbot";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import ProtectedRoute from "./ProtectedRoute";

import "./App.css";

function AppContent() {
  const location = useLocation();

  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const stockData = [
    { produit: "Stylo", stock: 80 },
    { produit: "Clavier", stock: 0 },
    { produit: "Souris", stock: 10 },
    { produit: "PC", stock: 0 },
  ];

  const hideLayout = ["/login", "/", "/forgot-password", "/reset-password"].includes(location.pathname);

  return (
    <div className="app-container">

      {!hideLayout && <Sidebar darkMode={darkMode} />}

      <div className="main-area">

        {!hideLayout && (
          <Navbar
            toggleDarkMode={toggleDarkMode}
            darkMode={darkMode}
          />
        )}

        <div className="content">

          <Routes>

            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* 👑 ADMIN = كلشي */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Admin />
                </ProtectedRoute>
              }
            />

            {/* 👥 CLIENTS */}
            <Route
              path="/clients"
              element={
                <ProtectedRoute allowedRoles={["admin", "responsable"]}>
                  <Clients />
                </ProtectedRoute>
              }
            />

            {/* 🚚 FOURNISSEURS */}
            <Route
              path="/fournisseurs"
              element={
                <ProtectedRoute allowedRoles={["admin", "responsable"]}>
                  <Fournisseurs />
                </ProtectedRoute>
              }
            />

            {/* 📦 PRODUCTS */}
            <Route
              path="/products"
              element={
                <ProtectedRoute allowedRoles={["admin", "magasinier"]}>
                  <Products />
                </ProtectedRoute>
              }
            />

            {/* 🔄 MOUVEMENT */}
            <Route
              path="/mouvement"
              element={
                <ProtectedRoute allowedRoles={["admin", "magasinier"]}>
                  <MouvementPage />
                </ProtectedRoute>
              }
            />

            {/* 🖨 BARCODE */}
            <Route
              path="/barcode"
              element={
                <ProtectedRoute allowedRoles={["admin", "magasinier"]}>
                  <BarcodePage />
                </ProtectedRoute>
              }
            />

            {/* 📊 DASHBOARD */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin", "responsable"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* 📊 REPORTS */}
            <Route
              path="/rapportstock"
              element={
                <ProtectedRoute allowedRoles={["admin", "responsable"]}>
                  <RapportStock />
                </ProtectedRoute>
              }
            />

            {/* ⚠️ STOCK ALERT */}
            <Route
              path="/stockalert"
              element={
                <ProtectedRoute allowedRoles={["admin", "responsable", "magasinier"]}>
                  <StockAlert stockData={stockData} />
                </ProtectedRoute>
              }
            />

            {/* 📄 FACTURE */}
            <Route
              path="/facture"
              element={
                <ProtectedRoute allowedRoles={["admin", "responsable", "magasinier"]}>
                  <Facture />
                </ProtectedRoute>
              }
            />
            <Route
              path="/Chatbot"
              element={
               <ProtectedRoute allowedRoles={["admin", "responsable", "magasinier"]}>
                <Chatbot />
             </ProtectedRoute>
  }
/>

            <Route path="*" element={<Login />} />

          </Routes>

        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}