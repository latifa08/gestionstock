import React, { useEffect, useState } from "react";
import axios from "axios";
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
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);

        // ===== OVERVIEW =====
        const resOverview = await axios.get(
          "http://localhost:5000/dashboard/overview"
        );
        setOverview(resOverview.data || {});

        // ===== MOUVEMENTS =====
        const resMouvements = await axios.get(
          "http://localhost:5000/mouvements"
        );

        const mouv = Array.isArray(resMouvements.data)
          ? resMouvements.data
          : [];

        setMouvements(mouv);

        // ===== TOP PRODUCTS =====
        const ventes = {};

        mouv.forEach((m) => {
          if ((m.type === "SORTIE" || m.type === "vente") && m.produit) {
            ventes[m.produit] =
              (ventes[m.produit] || 0) + (m.quantite || 0);
          }
        });

        const top = Object.entries(ventes)
          .map(([produit, ventes]) => ({ produit, ventes }))
          .sort((a, b) => b.ventes - a.ventes)
          .slice(0, 5);

        const max = top[0]?.ventes || 1;

        setTopStoresData(
          top.map((t) => ({
            ...t,
            percent: Math.round((t.ventes / max) * 100),
          }))
        );

        // ===== LINE CHART =====
        const months = [
          "Jan","Fev","Mar","Avr","Mai","Jui",
          "Juil","Aou","Sep","Oct","Nov","Dec"
        ];

        setLineData(
          months.map((m, idx) => ({
            name: m,
            value: mouv.filter((mv) => {
              if (!mv.date) return false;
              const d = new Date(mv.date);
              if (isNaN(d.getTime())) return false;

              return (
                d.getMonth() === idx &&
                (mv.type === "SORTIE" || mv.type === "vente")
              );
            }).length,
          }))
        );

        // ===== PRODUCTS STOCK =====
        const resProducts = await axios.get(
          "http://localhost:5000/products"
        );

        const products = Array.isArray(resProducts.data)
          ? resProducts.data
          : [];

        const total = products.length;
        const inStock = products.filter((p) => (p.quantite || 0) > 0).length;
        const outStock = total - inStock;

        setPieData([
          { name: "En Stock", value: inStock },
          { name: "Hors stock", value: outStock },
        ]);

        // ===== BAR CHART =====
        const days = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

        setBarData(
          days.map((d, idx) => ({
            name: d,
            value: mouv.filter((mv) => {
              if (!mv.date) return false;
              const date = new Date(mv.date);
              if (isNaN(date.getTime())) return false;

              return (
                date.getDay() === idx &&
                (mv.type === "SORTIE" || mv.type === "vente")
              );
            }).length,
          }))
        );

        setLoading(false);
      } catch (err) {
        console.error("Dashboard error:", err);
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <h3>Loading dashboard...</h3>;

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

        {/* LINE CHART */}
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

        {/* PIE CHART (FIXED) */}
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
              {pieData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={pieColors[i % pieColors.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </div>

        {/* TOP PRODUCTS */}
        <div className="card">
          <TopStores topStores={topStoresData} />
        </div>
      </div>

      <div className="grid-2">

        {/* CALENDAR */}
        <div className="card">
          <h3>Calendrier</h3>
          <div className="calendar">
            {["L","M","M","J","V","S","D"].map((d) => (
              <div key={d} className="day head">{d}</div>
            ))}

            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;

              const hasActivity = mouvements.some((m) => {
                if (!m.date) return false;
                const d = new Date(m.date);
                return d.getDate() === day;
              });

              return (
                <div
                  key={i}
                  className={`day ${hasActivity ? "active" : ""}`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* BAR CHART */}
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