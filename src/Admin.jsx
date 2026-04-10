import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Admin.css";

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("magasinier");
  const [search, setSearch] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));

  // 🔐 protect page (simple without token)
  useEffect(() => {
    if (!user || user.role !== "admin") {
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  // =========================
  // GET USERS
  // =========================
  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users");
      setUsers(res.data);
    } catch (err) {
      console.error("GET USERS ERROR:", err.message);
    }
  };

  // =========================
  // ADD USER
  // =========================
  const addUser = async () => {
    if (!email || !password) return alert("Fill all fields");

    try {
      await axios.post("http://localhost:5000/api/users", {
        email,
        password,
        role,
      });

      setEmail("");
      setPassword("");
      setRole("magasinier");

      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Error adding user");
    }
  };

  // =========================
  // DELETE USER
  // =========================
  const deleteUser = async (id) => {
    if (!window.confirm("Delete user?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  // =========================
  // EDIT USER
  // =========================
  const editUser = async (id) => {
    const newEmail = prompt("New email:");
    const newRole = prompt("Role (admin / magasinier / responsable / user):");

    if (!newEmail || !newRole) return;

    try {
      await axios.put(`http://localhost:5000/api/users/${id}`, {
        email: newEmail,
        role: newRole,
      });

      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Update failed");
    }
  };

  // =========================
  // SEARCH FILTER
  // =========================
  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-page">
      <h2>Admin Panel</h2>

      {/* ADD USER */}
      <div className="form-admin">
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="magasinier">magasinier</option>
          <option value="responsable">responsable</option>
          <option value="admin">admin</option>
          <option value="user">user</option>
        </select>

        <button onClick={addUser}>Add</button>
      </div>

      {/* SEARCH */}
   {/* SEARCH */}
<input
  id="searchUser"
  placeholder="search..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
/>
      {/* TABLE */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>
                <button onClick={() => editUser(u.id)}>Edit</button>
                <button onClick={() => deleteUser(u.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Admin;