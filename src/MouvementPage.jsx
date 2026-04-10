import React, { useState, useEffect } from "react";
import axios from "axios";
import "./MouvementPage.css";

const MouvementPage = () => {
  const [produits, setProduits] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [clients, setClients] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);

  const [nouveauProduit, setNouveauProduit] = useState({
    nom: "",
    quantite: "",
    client_id: "",
    fournisseur_id: "",
  });

  const [recherche, setRecherche] = useState("");

  const API_PRODUITS = "http://localhost:5000/products";
  const API_MOUVEMENTS = "http://localhost:5000/mouvements";
  const API_CLIENTS = "http://localhost:5000/clients";
  const API_FOURNISSEURS = "http://localhost:5000/fournisseurs";

  useEffect(() => {
    fetchProduits();
    fetchMouvements();
    fetchClients();
    fetchFournisseurs();
  }, []);

  // ================= FETCH =================
  const fetchProduits = async () => {
    try {
      const res = await axios.get(API_PRODUITS);
      setProduits(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMouvements = async () => {
    try {
      const res = await axios.get(API_MOUVEMENTS);
      setMouvements(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get(API_CLIENTS);
      setClients(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFournisseurs = async () => {
    try {
      const res = await axios.get(API_FOURNISSEURS);
      setFournisseurs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ================= INPUT =================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNouveauProduit((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ================= AJOUT =================
  const ajouterProduit = async () => {
    if (!nouveauProduit.nom || !nouveauProduit.quantite)
      return alert("Nom et quantité requis");

    const qte = Number(nouveauProduit.quantite);
    if (qte <= 0 || isNaN(qte))
      return alert("Quantité invalide");

    try {
      const res = await axios.post(API_PRODUITS, {
        nom_produit: nouveauProduit.nom,
        categorie: "General",
        description: "",
        quantite: qte,
        prix_unitaire: 0,
        fournisseur: "",
        date_ajout: new Date(),
        niveau_alerte: 0,
      });

      // 🔥 fournisseur = من المنتج (مش من input)
      const produit = produits.find(
        (p) => p.nom_produit === nouveauProduit.nom
      );

      await axios.post(API_MOUVEMENTS, {
        id_produit: res.data.id_produit || res.data.id,
        type: "ENTREE",
        quantite: qte,
        id_client: nouveauProduit.client_id || null,
        id_fournisseur: produit?.fournisseur_id || null,
      });

      fetchProduits();
      fetchMouvements();

      setNouveauProduit({
        nom: "",
        quantite: "",
        client_id: "",
        fournisseur_id: "",
      });
    } catch (err) {
      console.error(err);
      alert("Erreur ajout produit");
    }
  };

  // ================= RETRAIT =================
  const retirerProduit = async (id, stockActuel) => {
    let qte = prompt("Quantité à retirer :");
    qte = Number(qte);

    if (isNaN(qte) || qte <= 0)
      return alert("Quantité invalide");

    if (qte > stockActuel)
      return alert("Stock insuffisant");

    try {
      const produit = produits.find((p) => p.id_produit === id);

      await axios.put(`${API_PRODUITS}/${id}`, {
        ...produit,
        quantite: produit.quantite - qte,
      });

      await axios.post(API_MOUVEMENTS, {
        id_produit: id,
        type: "SORTIE",
        quantite: qte,
        id_client: nouveauProduit.client_id || null,
        id_fournisseur: produit?.fournisseur_id || null,
      });

      fetchProduits();
      fetchMouvements();
    } catch (err) {
      console.error(err);
      alert("Erreur retrait produit");
    }
  };

  const produitsFiltres = produits.filter((p) =>
    p.nom_produit?.toLowerCase().includes(recherche.toLowerCase())
  );

  // ================= UI =================
  return (
    <div className="mouvement-page">
      <h2>Page Mouvement</h2>

      {/* FORM (نفس التصميم) */}
      <div className="form-ajout">
        <input
          type="text"
          name="nom"
          placeholder="Nom Produit"
          value={nouveauProduit.nom}
          onChange={handleChange}
        />

        <input
          type="number"
          name="quantite"
          placeholder="Quantité"
          value={nouveauProduit.quantite}
          onChange={handleChange}
        />

        {/* 🔥 CLIENT SELECT */}
        <select
          name="client_id"
          value={nouveauProduit.client_id}
          onChange={handleChange}
        >
          <option value="">Client (optionnel)</option>
          {clients.map((c) => (
            <option key={c.id_client} value={c.id_client}>
              {c.nom}
            </option>
          ))}
        </select>

        <button onClick={ajouterProduit}>
          Ajouter 
        </button>
      </div>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Rechercher..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      {/* PRODUITS (نفسه) */}
      <h3>Produits</h3>
      <table className="mouvement-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nom</th>
            <th>Quantité</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {produitsFiltres.length === 0 ? (
            <tr>
              <td colSpan="4">Aucun produit</td>
            </tr>
          ) : (
            produitsFiltres.map((p) => (
              <tr key={p.id_produit}>
                <td>{p.id_produit}</td>
                <td>{p.nom_produit}</td>
                <td>{p.quantite}</td>
                <td>
                  <button
                    onClick={() =>
                      retirerProduit(p.id_produit, p.quantite)
                    }
                  >
                    Retirer
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* HISTORIQUE (نفسه) */}
      <h3>Historique</h3>
      <table className="mouvement-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Produit</th>
            <th>Type</th>
            <th>Quantité</th>
            <th>Client</th>
            <th>Fournisseur</th>
            <th>Date</th>
          </tr>
        </thead>

        <tbody>
          {mouvements.length === 0 ? (
            <tr>
              <td colSpan="7">Aucun mouvement</td>
            </tr>
          ) : (
            mouvements.map((m) => (
              <tr key={m.id_mouvement}>
                <td>{m.id_mouvement}</td>
                <td>{m.nom_produit || m.id_produit}</td>
                <td>{m.type}</td>
                <td>{m.quantite}</td>
                <td>{m.nom_client || "-"}</td>
                <td>{m.nom_fournisseur || "-"}</td>
                <td>
                  {m.date
                    ? new Date(m.date).toLocaleString()
                    : "-"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MouvementPage;