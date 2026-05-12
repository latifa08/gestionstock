import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import api from "./api";
import "./Admin.css";

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState(null); // null | 'create' | 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalForm, setModalForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    role: "magasinier",
  });
  const [modalLoading, setModalLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!user || user.role !== "admin") {
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/users");
      setUsers(res.data);
    } catch (err) {
      console.error("GET USERS ERROR:", err.message);
    }
  };

  const resetModal = () => {
    setModalMode(null);
    setSelectedUser(null);
    setModalForm({ first_name: "", last_name: "", email: "", password: "", phone: "", role: "magasinier" });
  };

  const openEditModal = (u) => {
    setSelectedUser(u);
    setModalForm({
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      email: u.email,
      password: "",
      phone: u.phone || "",
      role: u.role,
    });
    setModalMode("edit");
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      if (modalMode === "create") {
        await api.post("/api/users", modalForm);
        Swal.fire({
          icon: "success",
          title: "Utilisateur créé",
          timer: 2000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      } else {
        const { first_name, last_name, email, phone, role } = modalForm;
        await api.put(`/api/users/${selectedUser.id}`, { first_name, last_name, email, phone, role });
        Swal.fire({
          icon: "success",
          title: "Utilisateur mis à jour",
          timer: 2000,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
        });
      }
      await fetchUsers();
      resetModal();
    } catch (err) {
      const data = err.response?.data;
      const detail = data?.errors?.length
        ? data.errors.map(e => `• ${e.field}: ${e.message}`).join("\n")
        : data?.message || "Erreur serveur";
      Swal.fire({
        icon: "error",
        title: "Erreur de validation",
        text: detail,
      });
    } finally {
      setModalLoading(false);
    }
  };

  const deleteUser = async (u) => {
    const result = await Swal.fire({
      title: "Supprimer cet utilisateur ?",
      text: `${u.first_name || ""} ${u.last_name || u.email}`.trim(),
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#e74c3c",
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/api/users/${u.id}`);
      Swal.fire({
        icon: "success",
        title: "Utilisateur supprimé",
        timer: 2000,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
      });
      fetchUsers();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: err.response?.data?.message || "Suppression échouée",
      });
    }
  };

  const filtered = users.filter((u) =>
    `${u.first_name || ""} ${u.last_name || ""} ${u.email} ${u.role || ""} ${u.phone || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-page">
      <h2>Admin Panel</h2>

      <div style={{ textAlign: "center", marginBottom: "25px" }}>
        <button className="btn-add-user" onClick={() => setModalMode("create")}>
          Ajouter un utilisateur
        </button>
      </div>

      <input
        id="searchUser"
        placeholder="Rechercher..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table className="admin-table">
        <thead>
          <tr>
            <th>Nom complet</th>
            <th>Email</th>
            <th>Téléphone</th>
            <th>Rôle</th>
            <th>Créé le</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.id}>
              <td>{`${u.first_name || ""} ${u.last_name || ""}`.trim() || "—"}</td>
              <td>{u.email}</td>
              <td>{u.phone || "—"}</td>
              <td>{u.role}</td>
              <td>{u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : "—"}</td>
              <td>
                <button onClick={() => openEditModal(u)}>Modifier</button>
                <button className="delete-btn" onClick={() => deleteUser(u)}>Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalMode && (
        <div className="modal-overlay" onClick={resetModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{modalMode === "create" ? "Ajouter un utilisateur" : "Modifier l'utilisateur"}</h3>
            <form onSubmit={handleModalSubmit}>
              <input
                type="text"
                placeholder="Prénom"
                value={modalForm.first_name}
                onChange={(e) => setModalForm({ ...modalForm, first_name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Nom"
                value={modalForm.last_name}
                onChange={(e) => setModalForm({ ...modalForm, last_name: e.target.value })}
              />
              <input
                type="email"
                placeholder="Email *"
                required
                value={modalForm.email}
                onChange={(e) => setModalForm({ ...modalForm, email: e.target.value })}
              />
              {modalMode === "create" && (
                <input
                  type="password"
                  placeholder="Mot de passe *"
                  required
                  minLength={8}
                  value={modalForm.password}
                  onChange={(e) => setModalForm({ ...modalForm, password: e.target.value })}
                />
              )}
              <input
                type="text"
                placeholder="Téléphone"
                value={modalForm.phone}
                onChange={(e) => setModalForm({ ...modalForm, phone: e.target.value })}
              />
              <select
                value={modalForm.role}
                onChange={(e) => setModalForm({ ...modalForm, role: e.target.value })}
              >
                <option value="magasinier">magasinier</option>
                <option value="responsable">responsable</option>
                <option value="admin">admin</option>
              </select>
              <div className="modal-actions">
                <button type="button" onClick={resetModal}>Annuler</button>
                <button type="submit" disabled={modalLoading}>
                  {modalLoading ? "..." : modalMode === "create" ? "Créer" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
