import React, { useState, useEffect } from "react";
import axios from "axios";
import "./MouvementPage.css";

const MouvementPage = () => {
  const [produits, setProduits] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [nouveauProduit, setNouveauProduit] = useState({ nom: "", quantite: "" });
  const [recherche, setRecherche] = useState("");

  const API_PRODUITS = "http://localhost:5000/products";
  const API_MOUVEMENTS = "http://localhost:5000/mouvements";

  useEffect(() => {
    fetchProduits();
    fetchMouvements();
  }, []);

  const fetchProduits = async () => {
    try {
      const res = await axios.get(API_PRODUITS);
      setProduits(res.data);
    } catch (err) {
      console.error(err);
      alert("Erreur serveur produits");
    }
  };

  const fetchMouvements = async () => {
    try {
      const res = await axios.get(API_MOUVEMENTS);
      setMouvements(res.data);
    } catch (err) {
      console.error(err);
      alert("Erreur serveur mouvements");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNouveauProduit({ ...nouveauProduit, [name]: value });
  };

  // ✅ Ajouter Produit + Mouvement ENTREE
  const ajouterProduit = async () => {
    if (!nouveauProduit.nom || !nouveauProduit.quantite) return alert("Nom et quantité requis");
    const qte = parseInt(nouveauProduit.quantite);
    if (isNaN(qte) || qte <= 0) return alert("Quantité invalide");

    try {
      // 1. Ajouter produit
      const res = await axios.post(API_PRODUITS, {
        nom_produit: nouveauProduit.nom,
        categorie: "General",
        description: "",
        quantite: qte,
        prix_unitaire: 0,
        fournisseur: "",
        date_ajout: new Date(),
        niveau_alerte: 0
      });

      // 2. Ajouter mouvement ENTREE
      await axios.post(API_MOUVEMENTS, {
        id_produit: res.data.id,
        type: "ENTREE",
        quantite: qte
      });

      fetchProduits();
      fetchMouvements();
      setNouveauProduit({ nom: "", quantite: "" });
    } catch (err) {
      console.error(err);
      alert("Erreur serveur lors de l'ajout");
    }
  };

  // ✅ Retirer Produit + Mouvement SORTIE
  const retirerProduit = async (id, stockActuel) => {
    let qte = prompt("Quantité à retirer :");
    qte = parseInt(qte);
    if (!qte || isNaN(qte) || qte <= 0) return;
    if (qte > stockActuel) return alert("Quantité supérieure au stock disponible");

    try {
      // 1. Mettre à jour le produit
      const produit = produits.find(p => p.id_produit === id);
      await axios.put(`${API_PRODUITS}/${id}`, {
        nom_produit: produit.nom_produit,
        categorie: produit.categorie,
        description: produit.description,
        quantite: produit.quantite - qte,
        prix_unitaire: produit.prix_unitaire,
        fournisseur: produit.fournisseur,
        date_ajout: produit.date_ajout,
        niveau_alerte: produit.niveau_alerte
      });

      // 2. Ajouter mouvement SORTIE
      await axios.post(API_MOUVEMENTS, {
        id_produit: id,
        type: "SORTIE",
        quantite: qte
      });

      fetchProduits();
      fetchMouvements();
    } catch (err) {
      console.error(err);
      alert("Erreur serveur lors du retrait");
    }
  };

  const produitsFiltres = produits.filter(p =>
    p.nom_produit?.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div className="mouvement-page">
      <h2>Page Mouvement</h2>

      {/* Formulaire */}
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
        <button onClick={ajouterProduit}>Ajouter / Réception</button>
      </div>

      <input
        type="text"
        placeholder="Rechercher un produit..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      {/* Produits */}
      <h3>Produits en stock</h3>
      <table className="mouvement-table">
        <thead>
          <tr>
            <th>ID Produit</th>
            <th>Nom</th>
            <th>Quantité</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {produitsFiltres.length === 0 ? (
            <tr>
              <td colSpan="4" className="empty-row">Aucun produit trouvé</td>
            </tr>
          ) : (
            produitsFiltres.map((p) => (
              <tr key={p.id_produit}>
                <td>{p.id_produit}</td>
                <td>{p.nom_produit}</td>
                <td>{p.quantite}</td>
                <td>
                  <button onClick={() => retirerProduit(p.id_produit, p.quantite)}>
                    Retirer
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Historique */}
      <h3>Historique des mouvements (lecture seule)</h3>
      <table className="mouvement-table">
        <thead>
          <tr>
            <th>ID Mouvement</th>
            <th>Produit</th>
            <th>Client</th>
            <th>Fournisseur</th>
            <th>Type</th>
            <th>Quantité</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {mouvements.length === 0 ? (
            <tr>
              <td colSpan="7" className="empty-row">Aucun mouvement enregistré</td>
            </tr>
          ) : (
            mouvements.map((m) => (
              <tr key={m.id_mouvement}>
                <td>{m.id_mouvement}</td>
                <td>{m.produit || "-"}</td>
                <td>{m.client || "-"}</td>
                <td>{m.fournisseur || "-"}</td>
                <td>{m.type}</td>
                <td>{m.quantite}</td>
                <td>{new Date(m.date).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MouvementPage;