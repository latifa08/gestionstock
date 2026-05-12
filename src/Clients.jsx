import React, { useState, useEffect } from "react";
import api from "./api";
import "./Clients.css";

export default function Clients() {
  const apiUrl = "/clients";

  const initialForm = { nom: "", telephone: "", adresse: "", email: "", type: "" };
  const [list, setList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [modalError, setModalError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await api.get(apiUrl);
      setList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setModalError("");
    if (!form.nom.trim()) {
      return setModalError("Le nom est obligatoire.");
    }

    try {
      if (editId !== null) {
        await api.put(`${apiUrl}/${editId}`, form);
      } else {
        await api.post(apiUrl, form);
      }

      await fetchClients();
      setForm(initialForm);
      setEditId(null);
      setShowModal(false);

    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        setModalError(data.errors.map(e => `${e.field}: ${e.message}`).join(" | "));
      } else {
        setModalError(data?.message || err.message || "Erreur serveur");
      }
    }
  };

  const handleEdit = (client) => {
    setModalError("");
    setForm({
      nom: client.nom || "",
      telephone: client.telephone || "",
      adresse: client.adresse || "",
      email: client.email || "",
      type: client.type || "",
    });

    setEditId(client.id_client);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce client ?")) return;

    try {
      await api.delete(`${apiUrl}/${id}`);
      fetchClients();
    } catch (err) {
      console.error(err);
    }
  };

  // 🔥 NEW: filter list
  const filteredList = list.filter(
    (c) =>
      (c.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.telephone || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page">
      <div className="header">
        <h2>Gestion des Clients</h2>
        <button
          type="button"
          onClick={() => {
            setForm(initialForm);
            setEditId(null);
            setModalError("");
            setShowModal(true);
          }}
        >
          + Ajouter client
        </button>
      </div>

      {/* 🔥 SEARCH (UNDER TITLE ONLY LIKE FOURNISSEUR) */}
      <input
        className="search"
        placeholder="Search client..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Téléphone</th>
            <th>Adresse</th>
            <th>Email</th>
            <th>Type</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredList.length === 0 ? (
            <tr>
              <td colSpan="7">No clients yet</td>
            </tr>
          ) : (
            filteredList.map((c) => (
              <tr key={c.id_client}>
                <td>{c.id_client}</td>
                <td>{c.nom}</td>
                <td>{c.telephone}</td>
                <td>{c.adresse}</td>
                <td>{c.email}</td>
                <td>{c.type}</td>

                <td>
                  <button type="button" className="edit" onClick={() => handleEdit(c)}>
                    edit
                  </button>

                  <button type="button" className="delete" onClick={() => handleDelete(c.id_client)}>
                    delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showModal && (
        <div className="overlay">
          <div className="modal">
            <h3>{editId ? "Modifier le client" : "Ajouter un client"}</h3>

            <div className="form-field">
              <label className="field-label">Nom *</label>
              <input name="nom" placeholder="Nom du client" value={form.nom} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="field-label">Téléphone</label>
              <input name="telephone" placeholder="Ex: 0555 123 456" value={form.telephone} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="field-label">Adresse</label>
              <input name="adresse" placeholder="Adresse complète" value={form.adresse} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="field-label">Email</label>
              <input name="email" placeholder="exemple@mail.com" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="field-label">Type de client</label>
              <input name="type" placeholder="Ex: Particulier, Entreprise…" value={form.type} onChange={handleChange} />
            </div>

            {modalError && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
                padding: "10px 14px", color: "#b91c1c", fontSize: 13
              }}>
                {modalError}
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="cancel" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button type="button" className="save" onClick={handleSave}>
                {editId ? "Modifier" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}