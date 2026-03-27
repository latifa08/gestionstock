import React from "react";
import Sidebar from "./Sidebar.js";
import Header from "./Header";
import OverviewCards from "./OverviewCards";
import ProfitChart from "./ProfitChart";
import TopStores from "./TopStores";


function AdminDashboard() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="content">
        <Header />
        <OverviewCards />
        <div className="dashboard-grid">
          <ProfitChart />
          <TopStores />
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;