import React, { useState, useEffect } from "react";
import api from "./api";
import "./Fournisseurs.css";

export default function Fournisseurs() {
  const apiUrl = "/fournisseurs";

  const [list, setList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    nom: "",
    societe: "",
    telephone: "",
    email: "",
    adresse: "",
  });
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    fetchFournisseurs();
  }, []);

  const fetchFournisseurs = async () => {
    try {
      const res = await api.get(apiUrl);
      setList(res.data);
    } catch (err) {
      console.error(err);
      alert("Erreur serveur");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setModalError("");
    if (!form.nom.trim()) {
      return setModalError("Le nom est obligatoire.");
    }

    try {
      if (editId !== null) {
        await api.put(`${apiUrl}/${editId}`, form);
        setList((prev) => prev.map((f) => f.id === editId ? { ...form, id: editId } : f));
        setEditId(null);
      } else {
        const res = await api.post(apiUrl, form);
        setList([...list, { ...form, id: res.data.id }]);
      }

      setForm({ nom: "", societe: "", telephone: "", email: "", adresse: "" });
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

  // ✅ FIX فقط: استعمل id بدل index
  const handleEdit = (id) => {
    const item = list.find((f) => f.id === id);
    setModalError("");
    setForm(item);
    setEditId(id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce fournisseur ?"))
      return;

    try {
      await api.delete(`${apiUrl}/${id}`);
      setList(list.filter((f) => f.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erreur serveur");
    }
  };

  const filteredList = list.filter(
    (f) =>
      (f.nom || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.societe || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page">
      <div className="header">
        <h2>Gestion des Fournisseurs</h2>
        <button
          onClick={() => {
            setForm({ nom: "", societe: "", telephone: "", email: "", adresse: "" });
            setEditId(null);
            setModalError("");
            setShowModal(true);
          }}
        >
          + Ajouter fournisseur
        </button>
      </div>

      <input
        className="search"
        placeholder="Search fournisseur..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Société</th>
            <th>Téléphone</th>
            <th>Email</th>
            <th>Adresse</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredList.length === 0 ? (
            <tr>
              <td colSpan="7" className="empty">
                Aucun fournisseur trouvé
              </td>
            </tr>
          ) : (
            filteredList.map((f) => (
              <tr key={f.id}>
                <td>{f.id}</td>
                <td>{f.nom}</td>
                <td>{f.societe}</td>
                <td>{f.telephone}</td>
                <td>{f.email}</td>
                <td>{f.adresse}</td>

                <td>
                  <button className="edit" onClick={() => handleEdit(f.id)}>
                    edit
                  </button>
                  <button
                    className="delete"
                    onClick={() => handleDelete(f.id)}
                  >
                    delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editId !== null ? "Modifier le fournisseur" : "Ajouter un fournisseur"}</h3>

            <div className="form-field">
              <label className="field-label">Nom *</label>
              <input name="nom" placeholder="Nom du fournisseur" value={form.nom} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="field-label">Société</label>
              <input name="societe" placeholder="Nom de la société" value={form.societe} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="field-label">Téléphone</label>
              <input name="telephone" placeholder="Ex: 0555 123 456" value={form.telephone} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="field-label">Email</label>
              <input name="email" placeholder="exemple@mail.com" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="field-label">Adresse</label>
              <input name="adresse" placeholder="Adresse complète" value={form.adresse} onChange={handleChange} />
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
              <button className="cancel" onClick={() => setShowModal(false)}>Annuler</button>
              <button className="save" onClick={handleSave}>
                {editId !== null ? "Modifier" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}