import React, { useEffect, useState } from "react";
import api from "./api";
import OverviewCards from "./OverviewCards";
import TopStores from "./TopStores";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

import "./Dashboard.css";

const pieColors = ["#9d4edd", "#d3a0f7"];

export default function Dashboard() {
  const [overview, setOverview] = useState({});
  const [topStoresData, setTopStoresData] = useState([]);
  const [lineData, setLineData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [barData, setBarData] = useState([]);
  const [mouvMap, setMouvMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        // ================= OVERVIEW =================
        const resOverview = await api.get("/dashboard/overview");
        setOverview(resOverview.data || {});

        // ================= MOUVEMENTS =================
        const resMouvements = await api.get("/dashboard/mouvements");

        const mouv = Array.isArray(resMouvements.data)
          ? resMouvements.data
          : [];

        // ================= CLEAN DATE =================
        const formatDate = (d) => {
          const date = new Date(d);
          if (isNaN(date.getTime())) return null;
          return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        };

        // ================= CALENDAR MAP =================
        const map = {};
        mouv.forEach((m) => {
          const key = formatDate(m.date);
          if (key) map[key] = true;
        });
        setMouvMap(map);

        // ================= TOP PRODUCTS FIX =================
        const ventes = {};

        mouv.forEach((m) => {
          const type = (m.type || "").toLowerCase();

          if (type === "sortie" || type === "vente") {
            const name =
              m.nom_produit && m.nom_produit.trim() !== ""
                ? m.nom_produit
                : m.id_produit
                ? `Produit ${m.id_produit}`
                : "Produit inconnu";

            ventes[name] = (ventes[name] || 0) + (Number(m.quantite) || 0);
          }
        });

        const top = Object.entries(ventes)
          .map(([name, ventes]) => ({ name, ventes }))
          .sort((a, b) => b.ventes - a.ventes)
          .slice(0, 5);

        const max = top[0]?.ventes || 1;

        setTopStoresData(
          top.map((t) => ({
            ...t,
            percent: Math.round((t.ventes / max) * 100),
          }))
        );

        // ================= LINE (ACTIVITY FIX) =================
        const months = [
          "Jan","Fev","Mar","Avr","Mai","Jui",
          "Juil","Aou","Sep","Oct","Nov","Dec"
        ];

        setLineData(
          months.map((m, idx) => ({
            name: m,
            value: mouv.filter((mv) => {
              const date = new Date(mv.date);
              if (isNaN(date.getTime())) return false;

              const type = (mv.type || "").toLowerCase();

              return (
                date.getMonth() === idx &&
                (type === "sortie" || type === "vente")
              );
            }).length,
          }))
        );

        // ================= PIE =================
        const resProducts = await api.get("/dashboard/products");

        const products = Array.isArray(resProducts.data)
          ? resProducts.data
          : [];

        const inStock = products.filter((p) => (p.quantite || 0) > 0).length;
        const outStock = products.length - inStock;

        setPieData([
          { name: "En Stock", value: inStock },
          { name: "Hors stock", value: outStock },
        ]);

        // ================= BAR FIX =================
        const days = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

        setBarData(
          days.map((d, idx) => ({
            name: d,
            value: mouv.filter((mv) => {
              const date = new Date(mv.date);
              if (isNaN(date.getTime())) return false;

              const type = (mv.type || "").toLowerCase();

              return (
                date.getDay() === idx &&
                (type === "sortie" || type === "vente")
              );
            }).length,
          }))
        );

      } catch (err) {
        console.error(err);
        setError("Erreur chargement dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <h3>Loading dashboard...</h3>;
  if (error) return <h3 style={{ color: "red" }}>{error}</h3>;

  const today = new Date();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();

  return (
    <div className="dashboard-content">
      <h1>Stock Dashboard</h1>

      <OverviewCards overview={overview} />

      <div className="grid-3">
        <div className="card">
          <h3>Ventes</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line dataKey="value" stroke="#7b2cbf" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card center">
          <h3>Stock</h3>
          <PieChart width={250} height={200}>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={pieColors[i % pieColors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>

        <div className="card">
          <TopStores topStores={topStoresData} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Calendrier</h3>

          <div className="calendar">
            {["L","M","M","J","V","S","D"].map((d) => (
              <div key={d} className="day head">{d}</div>
            ))}

            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const key = `${today.getFullYear()}-${today.getMonth() + 1}-${day}`;

              return (
                <div
                  key={i}
                  className={`day ${mouvMap[key] ? "active" : ""}`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3>Activité</h3>

          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={barData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#7b2cbf" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}