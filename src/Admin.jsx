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
  const token = localStorage.getItem("token");

  // 🔐 protect page
  useEffect(() => {
    if (!user || user.role !== "admin") {
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  // GET USERS
  const fetchUsers = async () => {
    const res = await axios.get("http://localhost:5000/api/users", {
      headers: { Authorization: token },
    });

    setUsers(res.data);
  };

  // ADD USER
  const addUser = async () => {
    if (!email || !password) return alert("Fill fields");

    await axios.post(
      "http://localhost:5000/api/users",
      { email, password, role },
      { headers: { Authorization: token } }
    );

    setEmail("");
    setPassword("");
    setRole("magasinier");
    fetchUsers();
  };

  // DELETE USER
  const deleteUser = async (id) => {
    if (!window.confirm("Delete user?")) return;

    await axios.delete(`http://localhost:5000/api/users/${id}`, {
      headers: { Authorization: token },
    });

    fetchUsers();
  };

  // EDIT USER
  const editUser = async (id) => {
    const newEmail = prompt("New email:");
    const newRole = prompt("New role (admin/responsable/magasinier):");

    if (!newEmail || !newRole) return;

    await axios.put(
      `http://localhost:5000/api/users/${id}`,
      { email: newEmail, role: newRole },
      { headers: { Authorization: token } }
    );

    fetchUsers();
  };

  // SEARCH
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
        </select>

        <button onClick={addUser}>Add</button>
      </div>

      {/* SEARCH */}
      <input
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