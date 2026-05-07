import React, { useState, useEffect, useRef } from "react";
import api from "./api";
import "./Products.css";

const BACKEND = "http://localhost:5000";

const LABELS = {
  nom_produit:   "Nom du produit",
  categorie:     "Catégorie",
  description:   "Description",
  quantite:      "Quantité",
  prix_unitaire: "Prix unitaire (DA)",
  fournisseur:   "Fournisseur",
  date_ajout:    "Date d'ajout",
  niveau_alerte: "Niveau d'alerte",
  code_bar:      "Code-barre",
};

const NUMBER_FIELDS = ["quantite", "prix_unitaire", "niveau_alerte"];

const initialForm = {
  nom_produit:   "",
  categorie:     "",
  description:   "",
  quantite:      0,
  prix_unitaire: 0,
  fournisseur:   "",
  date_ajout:    new Date().toISOString().split("T")[0],
  niveau_alerte: 0,
  code_bar:      "",
};

export default function Products() {
  const apiUrl = "/products";

  const [list, setList]             = useState([]);
  const [showModal, setShowModal]   = useState(false);
  const [editId, setEditId]         = useState(null);
  const [form, setForm]             = useState(initialForm);
  const [search, setSearch]         = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // image state
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => { fetchProducts(); }, [showArchived]);

  const fetchProducts = async () => {
    try {
      const res = await api.get(`${apiUrl}?archived=${showArchived}`);
      setList(res.data);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: NUMBER_FIELDS.includes(name) ? Number(value) : value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const openAdd = () => {
    setForm(initialForm);
    setEditId(null);
    setImageFile(null);
    setImagePreview(null);
    setErrorMessage("");
    setShowModal(true);
  };

  const openEdit = (product) => {
    const { id_produit, image_url, archived_at, ...rest } = product;
    if (rest.date_ajout) rest.date_ajout = rest.date_ajout.split("T")[0];
    setForm(rest);
    setEditId(id_produit);
    setImageFile(null);
    setImagePreview(image_url ? `${BACKEND}${image_url}` : null);
    setErrorMessage("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSave = async () => {
    setErrorMessage("");
    if (!form.nom_produit.trim()) {
      setErrorMessage("Le nom du produit est obligatoire.");
      return;
    }
    try {
      const dataToSend = {
        ...form,
        code_bar: form.code_bar || Date.now().toString(),
      };

      let productId = editId;

      if (editId) {
        await api.put(`${apiUrl}/${editId}`, dataToSend);
      } else {
        const res = await api.post(apiUrl, dataToSend);
        productId = res.data.id;
      }

      // upload image if one was selected
      if (imageFile && productId) {
        const fd = new FormData();
        fd.append("image", imageFile);
        await api.post(`${apiUrl}/${productId}/image`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      closeModal();
      fetchProducts();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        setErrorMessage(data.errors.map((e) => `${LABELS[e.field] || e.field}: ${e.message}`).join("\n"));
      } else {
        setErrorMessage(data?.message || err.message);
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`${apiUrl}/${id}`);
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setErrorMessage(msg);
      alert("Erreur: " + msg);
    }
  };

  const handleRestore = async (id) => {
    try {
      await api.patch(`${apiUrl}/${id}/restore`);
      fetchProducts();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message);
    }
  };

  const handlePermanentDelete = async (id) => {
    try {
      await api.delete(`${apiUrl}/permanent/${id}`);
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setErrorMessage(msg);
      alert("Erreur: " + msg);
    }
  };

  const filteredList = list.filter((p) =>
    (p.nom_produit || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      {/* Header */}
      <div className="header">
        <h2>{showArchived ? "Produits Archivés" : "Gestion des Produits"}</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => { setShowArchived(!showArchived); setErrorMessage(""); }}
            style={{ background: showArchived ? "#6c757d" : undefined }}
          >
            {showArchived ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Voir actifs</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> Archives</>
            )}
          </button>
          {!showArchived && (
            <button onClick={openAdd}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Ajouter produit
            </button>
          )}
        </div>
      </div>

      {/* Page-level error */}
      {errorMessage && !showModal && (
        <div className="page-error">{errorMessage}</div>
      )}

      <input
        className="search"
        placeholder="Rechercher un produit..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>ID</th>
              <th>Nom</th>
              <th>Catégorie</th>
              <th>Description</th>
              <th>Quantité</th>
              <th>Prix (DA)</th>
              <th>Fournisseur</th>
              <th>Date</th>
              <th>Alerte</th>
              <th>Code-barre</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr><td colSpan="12" style={{ textAlign: "center" }}>Aucun produit trouvé</td></tr>
            ) : (
              filteredList.map((p) => (
                <tr key={p.id_produit}>
                  <td>
                    {p.image_url ? (
                      <img
                        src={`${BACKEND}${p.image_url}`}
                        alt={p.nom_produit}
                        className="product-thumb"
                      />
                    ) : (
                      <div className="product-thumb-placeholder">—</div>
                    )}
                  </td>
                  <td>{p.id_produit}</td>
                  <td>{p.nom_produit}</td>
                  <td>{p.categorie}</td>
                  <td>{p.description}</td>
                  <td>{p.quantite}</td>
                  <td>{p.prix_unitaire}</td>
                  <td>{p.fournisseur}</td>
                  <td>{p.date_ajout?.split("T")[0]}</td>
                  <td>{p.niveau_alerte}</td>
                  <td>{p.code_bar}</td>
                  <td>
                    {showArchived ? (
                      <>
                        <button className="edit" onClick={() => handleRestore(p.id_produit)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>
                          Restaurer
                        </button>
                        <button className="delete" onClick={() => handlePermanentDelete(p.id_produit)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                          Supprimer
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="edit" onClick={() => openEdit(p)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Modifier
                        </button>
                        <button className="delete" onClick={() => handleDelete(p.id_produit)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                          Archiver
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="overlay">
          <div className="modal">
            <h3 className="modal-title">{editId ? "Modifier le produit" : "Ajouter un produit"}</h3>

            {/* Image picker */}
            <div className="image-picker">
              <div
                className="image-preview-box"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="image-preview" />
                ) : (
                  <div className="image-placeholder">
                    <span>Cliquer pour ajouter une image</span>
                    <span className="image-hint">JPG · PNG · WEBP · max 2 Mo</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                style={{ display: "none" }}
                onChange={handleImageChange}
              />
              {imagePreview && (
                <button
                  className="remove-image-btn"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                >
                  Supprimer l'image
                </button>
              )}
            </div>

            {/* Form fields */}
            <div className="form-fields">
              {Object.keys(LABELS).map((key) => (
                <div className="form-field" key={key}>
                  <label className="field-label">{LABELS[key]}</label>
                  <input
                    name={key}
                    type={
                      NUMBER_FIELDS.includes(key) ? "number" :
                      key === "date_ajout" ? "date" : "text"
                    }
                    value={form[key]}
                    onChange={handleChange}
                    className="field-input"
                    placeholder={LABELS[key]}
                  />
                </div>
              ))}
            </div>

            {errorMessage && (
              <div className="modal-error"><pre>{errorMessage}</pre></div>
            )}

            <div className="modal-actions">
              <button onClick={closeModal}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Annuler
              </button>
              <button className="save" onClick={handleSave}>
                {editId ? (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Enregistrer</>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Ajouter</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
