import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

import stockImg from "./images/v.jpg";
import avatarImg from "./images/p.jpg";
import stockkImg from "./images/p.jpg";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setError("Trop de tentatives. Veuillez réessayer plus tard.");
        return;
      }

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setError(`Réponse invalide du serveur (HTTP ${res.status}): ${text.slice(0, 200)}`);
        return;
      }

      if (data.success) {
        setStatus(data.message);
      } else {
        setError(data.message || "Une erreur est survenue.");
      }
    } catch (err) {
      setError(`Erreur de connexion au serveur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-bg"
      style={{
        backgroundImage: `linear-gradient(rgba(90,24,154,0.9), rgba(123,44,191,0.9)), url(${stockkImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="login-box">
        <div className="login-brand">
          <h2>Gestion de Stock</h2>
          <p>Simple • Moderne • Efficace</p>
          <img src={stockImg} alt="stock" className="login-image" />
        </div>

        <div className="login-form">
          <img src={avatarImg} alt="avatar" className="login-avatar" />
          <h3>Mot de passe oublié</h3>

          {status ? (
            <>
              <p style={{ color: "#a78bfa", textAlign: "center", marginBottom: "1rem" }}>
                {status}
              </p>
              <p className="switch">
                <span style={{ cursor: "pointer", color: "#a78bfa" }} onClick={() => navigate("/login")}>
                  Retour à la connexion
                </span>
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: "0.875rem", marginBottom: "1rem", textAlign: "center" }}>
                Entrez votre adresse email pour recevoir un lien de réinitialisation.
              </p>
              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {error && <p className="error">{error}</p>}
                <button type="submit" disabled={loading}>
                  {loading ? "Envoi..." : "Envoyer le lien"}
                </button>
              </form>
              <p className="switch">
                <span style={{ cursor: "pointer", color: "#a78bfa" }} onClick={() => navigate("/login")}>
                  Retour à la connexion
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
