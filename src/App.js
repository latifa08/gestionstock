import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Dashboard from "./Dashboard";
import Admin from "./Admin";
import Clients from "./Clients";
import Fournisseurs from "./Fournisseurs";
import Products from "./Products";
import MouvementPage from "./MouvementPage";
import Facture from "./Facture";
import Login from "./Login";
import BarcodePage from "./BarcodePage";
import RapportStock from "./RapportStock";
import StockAlert from "./StockAlert";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import ProtectedRoute from "./ProtectedRoute";

import "./App.css";

function App() {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const stockData = [
    { produit: "Stylo", stock: 80 },
    { produit: "Clavier", stock: 0 },
    { produit: "Souris", stock: 10 },
    { produit: "PC", stock: 0 },
  ];

  return (
    <Router>
      <div className="app-container">
        <Sidebar darkMode={darkMode} />

        <div className="main-area">
          <Navbar toggleDarkMode={toggleDarkMode} darkMode={darkMode} />

          <div className="content">
            <Routes>

              {/* 🔓 LOGIN */}
              <Route path="/login" element={<Login />} />

              {/* 👑 ADMIN فقط */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Admin />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/clients"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Clients />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/fournisseurs"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Fournisseurs />
                  </ProtectedRoute>
                }
              />

              {/* 📦 MAGASINIER + ADMIN */}
              <Route
                path="/products"
                element={
                  <ProtectedRoute allowedRoles={["admin", "magasinier"]}>
                    <Products />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/mouvement"
                element={
                  <ProtectedRoute allowedRoles={["admin", "magasinier"]}>
                    <MouvementPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/barcode"
                element={
                  <ProtectedRoute allowedRoles={["admin", "magasinier"]}>
                    <BarcodePage />
                  </ProtectedRoute>
                }
              />

              {/* 📊 RESPONSABLE + ADMIN */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["admin", "responsable"]}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/rapportstock"
                element={
                  <ProtectedRoute allowedRoles={["admin", "responsable"]}>
                    <RapportStock />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/stockalert"
                element={
                  <ProtectedRoute allowedRoles={["admin", "responsable"]}>
                    <StockAlert stockData={stockData} />
                  </ProtectedRoute>
                }
              />

              {/* 💰 كامل يشوفوها */}
              <Route
                path="/facture"
                element={
                  <ProtectedRoute allowedRoles={["admin", "magasinier", "responsable"]}>
                    <Facture />
                  </ProtectedRoute>
                }
              />

              {/* ❌ أي route غلط */}
              <Route path="*" element={<Login />} />

            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;