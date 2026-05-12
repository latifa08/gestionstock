import React, { useState, useEffect, useRef } from "react";
import api from "./api";
import "./Products.css";

/* ── Lots modal ────────────────────────────────── */
function LotsModal({ product, onClose, onStockUpdated }) {
  const [lots,    setLots]    = useState([]);
  const [loading, setLoading] = useState(true);

  /* inline edit */
  const [editId,      setEditId]      = useState(null);
  const [editQty,     setEditQty]     = useState("");
  const [editExpiry,  setEditExpiry]  = useState("");
  const [editBusy,    setEditBusy]    = useState(false);
  const [editError,   setEditError]   = useState("");

  /* add-lot form */
  const [addQty,    setAddQty]    = useState("");
  const [addExpiry, setAddExpiry] = useState("");
  const [addBusy,   setAddBusy]   = useState(false);
  const [addError,  setAddError]  = useState("");

  const refresh = () => {
    setLoading(true);
    api.get(`/lots/product/${product.id_produit}`)
      .then(r => setLots(r.data))
      .catch(() => setLots([]))
      .finally(() => setLoading(false));
    if (onStockUpdated) onStockUpdated();
  };

  useEffect(() => { refresh(); }, [product.id_produit]);

  /* start editing a row */
  const startEdit = (lot) => {
    setEditId(lot.id_lot);
    setEditQty(String(lot.quantite));
    setEditExpiry(lot.date_expiration ? lot.date_expiration.split("T")[0] : "");
    setEditError("");
  };

  const cancelEdit = () => { setEditId(null); setEditError(""); };

  const saveEdit = async (id_lot) => {
    const qty = parseInt(editQty, 10);
    if (!qty || qty < 1) return setEditError("Quantité invalide.");
    setEditBusy(true);
    try {
      await api.put(`/lots/${id_lot}`, { quantite: qty, date_expiration: editExpiry || null });
      setEditId(null);
      refresh();
    } catch (err) {
      setEditError(err.response?.data?.message || "Erreur.");
    } finally {
      setEditBusy(false);
    }
  };

  const deleteLot = async (id_lot) => {
    if (!window.confirm("Supprimer ce lot ?")) return;
    try {
      await api.delete(`/lots/${id_lot}`);
      refresh();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la suppression.");
    }
  };

  const handleAddLot = async () => {
    setAddError("");
    const qty = parseInt(addQty, 10);
    if (!qty || qty < 1) return setAddError("Quantité invalide (minimum 1).");
    setAddBusy(true);
    try {
      await api.post("/mouvements", {
        id_produit:      product.id_produit,
        type:            "entree",
        quantite:        qty,
        date_expiration: addExpiry || null,
      });
      setAddQty(""); setAddExpiry("");
      refresh();
    } catch (err) {
      setAddError(err.response?.data?.message || "Erreur lors de l'ajout.");
    } finally {
      setAddBusy(false);
    }
  };

  const TD = { padding: "7px 10px", borderBottom: "1px solid #faf8ff", verticalAlign: "middle" };
  const TH = { padding: "7px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#7c6fa0", borderBottom: "1.5px solid #ede9fe", whiteSpace: "nowrap" };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <h3 className="modal-title">
          Lots — {product.nom_produit}
          <span style={{ fontWeight: 400, fontSize: 13, color: "#9589b8", marginLeft: 10 }}>
            Stock total : {lots.reduce((s, l) => s + Number(l.quantite), 0)} pcs
          </span>
        </h3>

        {/* ── Existing lots table ── */}
        {loading ? (
          <p style={{ textAlign: "center", color: "#9589b8", padding: "16px 0" }}>Chargement…</p>
        ) : lots.length === 0 ? (
          <p style={{ textAlign: "center", color: "#9589b8", padding: "16px 0" }}>Aucun lot — ajoutez-en un ci-dessous.</p>
        ) : (
          <>
            {editError && <div style={{ marginBottom: 8, color: "#dc2626", fontSize: 12, fontWeight: 600 }}>{editError}</div>}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 14 }}>
              <thead>
                <tr style={{ background: "#faf8ff" }}>
                  <th style={TH}>Lot #</th>
                  <th style={TH}>Entrée</th>
                  <th style={TH}>Expiration</th>
                  <th style={{ ...TH, textAlign: "right" }}>Quantité</th>
                  <th style={{ ...TH, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lots.map(lot => {
                  const daysLeft = lot.days_left !== null ? Number(lot.days_left) : null;
                  const isExpired = daysLeft !== null && daysLeft < 0;
                  const rowBg = isExpired ? "#fff1f2" : daysLeft !== null && daysLeft <= 3 ? "#fffbeb" : "";
                  const isEditing = editId === lot.id_lot;

                  return (
                    <tr key={lot.id_lot} style={{ background: rowBg }}>
                      <td style={{ ...TD, color: "#7c6fa0" }}>
                        #{lot.id_lot}
                        {isExpired && <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, color: "#dc2626" }}>EXPIRÉ</span>}
                      </td>
                      <td style={TD}>{lot.date_entree?.split("T")[0] || "—"}</td>

                      {/* expiration — editable */}
                      <td style={TD}>
                        {isEditing
                          ? <input className="lot-add-input" type="date" value={editExpiry}
                              onChange={e => setEditExpiry(e.target.value)}
                              style={{ width: 130, padding: "4px 8px" }} />
                          : lot.date_expiration
                            ? <ExpiryBadge date={lot.date_expiration} />
                            : <span style={{ color: "#b0a4cc", fontStyle: "italic" }}>Sans expiration</span>}
                      </td>

                      {/* quantity — editable */}
                      <td style={{ ...TD, textAlign: "right" }}>
                        {isEditing
                          ? <input className="lot-add-input" type="number" min="1" value={editQty}
                              onChange={e => setEditQty(e.target.value)}
                              style={{ width: 70, padding: "4px 8px", textAlign: "right" }} />
                          : <strong>{lot.quantite} pcs</strong>}
                      </td>

                      {/* action buttons */}
                      <td style={{ ...TD, textAlign: "center", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <>
                            <button className="lot-action-btn lot-save" onClick={() => saveEdit(lot.id_lot)} disabled={editBusy}>✓</button>
                            <button className="lot-action-btn lot-cancel" onClick={cancelEdit}>✕</button>
                          </>
                        ) : (
                          <>
                            <button className="lot-action-btn lot-edit" onClick={() => startEdit(lot)} title="Modifier">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button className="lot-action-btn lot-delete" onClick={() => deleteLot(lot.id_lot)} title="Supprimer">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {/* ── Add new lot form ── */}
        <div className="lot-add-box">
          <div className="lot-add-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ajouter un lot
          </div>
          <div className="lot-add-fields">
            <div className="lot-add-field">
              <label className="lot-add-label">Quantité *</label>
              <input
                className="lot-add-input"
                type="number" min="1" placeholder="0"
                value={addQty}
                onChange={e => setAddQty(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddLot()}
              />
            </div>
            <div className="lot-add-field">
              <label className="lot-add-label">Date d'expiration</label>
              <input
                className="lot-add-input"
                type="date"
                value={addExpiry}
                onChange={e => setAddExpiry(e.target.value)}
              />
            </div>
            <button className="lot-add-btn" onClick={handleAddLot} disabled={addBusy}>
              {addBusy ? "…" : "Ajouter"}
            </button>
          </div>
          {addError && <div className="lot-add-error">{addError}</div>}
          <p className="lot-add-hint">
            Si la date d'expiration correspond à un lot existant, les quantités seront fusionnées.
          </p>
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

const BACKEND = "http://localhost:5000";

function ExpiryBadge({ date }) {
  const exp = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((exp - today) / 86400000);
  const label = date.split("T")[0];
  if (diffDays < 0)  return <span className="exp-badge exp-expired">{label} (expiré)</span>;
  if (diffDays <= 3) return <span className="exp-badge exp-soon">{label} ({diffDays}j)</span>;
  return <span className="exp-badge exp-ok">{label}</span>;
}

const LABELS = {
  nom_produit:     "Nom du produit",
  categorie:       "Catégorie",
  description:     "Description",
  quantite:        "Quantité initiale",
  prix_unitaire:   "Prix unitaire (DA)",
  fournisseur:     "Fournisseur",
  date_ajout:      "Date d'ajout",
  niveau_alerte:   "Niveau d'alerte",
  code_bar:        "Code-barre",
  date_expiration: "Date d'expiration (lot initial)",
};

/* Fields shown only when creating a new product */
const CREATE_ONLY_FIELDS = ["quantite", "date_expiration"];

const NUMBER_FIELDS = ["quantite", "prix_unitaire", "niveau_alerte"];
const DATE_FIELDS   = ["date_ajout", "date_expiration"];

const initialForm = {
  nom_produit:     "",
  categorie:       "",
  description:     "",
  quantite:        0,
  prix_unitaire:   0,
  fournisseur:     "",
  date_ajout:      new Date().toISOString().split("T")[0],
  niveau_alerte:   0,
  code_bar:        "",
  date_expiration: "",
};

export default function Products() {
  const apiUrl = "/products";

  const [list, setList]             = useState([]);
  const [showModal, setShowModal]   = useState(false);
  const [lotsProduct, setLotsProduct] = useState(null);
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
    if (rest.date_ajout)      rest.date_ajout      = rest.date_ajout.split("T")[0];
    if (rest.date_expiration) rest.date_expiration = rest.date_expiration.split("T")[0];
    setForm({ ...initialForm, ...rest });
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
      let productId = editId;

      if (editId) {
        const { quantite, date_expiration, ...editData } = form;
        await api.put(`${apiUrl}/${editId}`, {
          ...editData,
          code_bar: editData.code_bar || Date.now().toString(),
        });
      } else {
        const res = await api.post(apiUrl, {
          ...form,
          code_bar: form.code_bar || Date.now().toString(),
        });
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
              <th>Date ajout</th>
              <th>Alerte</th>
              <th>Code-barre</th>
              <th>Lots</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr><td colSpan="13" style={{ textAlign: "center" }}>Aucun produit trouvé</td></tr>
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
                    <button className="lots-btn" onClick={() => setLotsProduct(p)} title="Voir / gérer les lots">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                      Lots
                      {Number(p.lots_expires) > 0 && <span className="lots-btn-warn">!</span>}
                    </button>
                  </td>
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

      {/* Lots modal */}
      {lotsProduct && (
        <LotsModal
          product={lotsProduct}
          onClose={() => setLotsProduct(null)}
          onStockUpdated={fetchProducts}
        />
      )}

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
              {Object.keys(LABELS)
                .filter(key => !editId || !CREATE_ONLY_FIELDS.includes(key))
                .map((key) => (
                  <div className="form-field" key={key}>
                    <label className="field-label">{LABELS[key]}</label>
                    <input
                      name={key}
                      type={
                        NUMBER_FIELDS.includes(key) ? "number" :
                        DATE_FIELDS.includes(key)   ? "date"   : "text"
                      }
                      value={form[key]}
                      onChange={handleChange}
                      className="field-input"
                      placeholder={LABELS[key]}
                    />
                  </div>
                ))}
              {editId && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f5f3ff", borderRadius: 8, border: "1px solid #ede9fe", fontSize: 12, color: "#7c6fa0" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  La quantité et les dates d'expiration sont gérées via les <strong style={{ color: "#5b2da3", marginLeft: 3 }}>Lots</strong>.
                </div>
              )}
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
