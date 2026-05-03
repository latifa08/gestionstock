import React, { useState, useEffect } from "react";
import api from "./api";
import "./Products.css";

export default function Products() {
  const apiUrl = "/products";

  const initialForm = {
    nom_produit: "",
    categorie: "",
    description: "",
    quantite: 0,
    prix_unitaire: 0,
    fournisseur: "",
    date_ajout: new Date().toISOString().split("T")[0],
    niveau_alerte: 0,
    code_bar: "",
  };

  const [list, setList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get(apiUrl);
      setList(res.data);
    } catch (err) {
      console.error("Erreur fetch produits:", err);
      setErrorMessage(err.response?.data?.error || err.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: ["quantite", "prix_unitaire", "niveau_alerte"].includes(name)
        ? Number(value)
        : value,
    });
  };

  const handleSave = async () => {
    setErrorMessage("");

    if (!form.nom_produit.trim() || !form.categorie.trim()) {
      setErrorMessage("Nom et Catégorie sont obligatoires !");
      return;
    }

    try {
      const dataToSend = {
        ...form,
        code_bar: form.code_bar || Date.now().toString(),
      };

      if (editId) {
        await api.put(`${apiUrl}/${editId}`, dataToSend);
      } else {
        await api.post(apiUrl, dataToSend);
      }

      setForm(initialForm);
      setEditId(null);
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      console.error("Erreur save produit:", err);
      setErrorMessage(err.response?.data?.error || err.message);
    }
  };

  const handleEdit = (product) => {
    const { id_produit, ...rest } = product;

    if (rest.date_ajout) {
      rest.date_ajout = rest.date_ajout.split("T")[0];
    }

    setForm(rest);
    setEditId(id_produit);
    setShowModal(true);
    setErrorMessage("");
  };

  const handleDelete = async (id) => {
    try {
      if (!window.confirm("Voulez-vous vraiment supprimer ce produit ?"))
        return;

      await api.delete(`${apiUrl}/${id}`);
      fetchProducts();
    } catch (err) {
      console.error("Erreur delete produit:", err);
      setErrorMessage(err.response?.data?.error || err.message);
    }
  };

  const filteredList = list.filter((p) =>
    (p.nom_produit || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="header">
        <h2>Gestion des Produits</h2>

        <button
          onClick={() => {
            setForm(initialForm);
            setEditId(null);
            setShowModal(true);
            setErrorMessage("");
          }}
        >
          + Add produit
        </button>
      </div>

      <input
        className="search"
        placeholder="Search produit..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Catégorie</th>
            <th>Description</th>
            <th>Quantité</th>
            <th>Prix</th>
            <th>Fournisseur</th>
            <th>Date</th>
            <th>Niveau Alerte</th>
            <th>Barcode</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredList.length === 0 ? (
            <tr>
              <td colSpan="11">Aucun produit trouvé</td>
            </tr>
          ) : (
            filteredList.map((p) => (
              <tr key={p.id_produit}>
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
                  <button className="edit" onClick={() => handleEdit(p)}>
                    edit
                  </button>
                  <button
                    className="delete"
                    onClick={() => handleDelete(p.id_produit)}
                  >
                    Delete
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
            <h3>{editId ? "Edit Produit" : "Add Produit"}</h3>

            {Object.keys(form).map((key) => (
              <input
                key={key}
                name={key}
                placeholder={key}
                type={
                  ["quantite", "prix_unitaire", "niveau_alerte"].includes(key)
                    ? "number"
                    : key === "date_ajout"
                    ? "date"
                    : "text"
                }
                value={form[key]}
                onChange={handleChange}
              />
            ))}

            {errorMessage && (
              <div style={{ color: "red" }}>
                <pre>{errorMessage}</pre>
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <button className="save" onClick={handleSave}>
                {editId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}