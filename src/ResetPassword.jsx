import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Login.css";

import stockImg from "./images/v.jpg";
import avatarImg from "./images/p.jpg";
import stockkImg from "./images/p.jpg";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [invalidToken, setInvalidToken] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInvalidToken(false);

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!token) {
      setInvalidToken(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (data.success) {
        navigate("/login", { state: { resetSuccess: true } });
        return;
      }

      if (data.code === "INVALID_TOKEN") {
        setInvalidToken(true);
      } else {
        setError(data.message || "Une erreur est survenue.");
      }
    } catch {
      setError("Erreur de connexion au serveur.");
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
          <h3>Nouveau mot de passe</h3>

          {invalidToken ? (
            <>
              <p className="error" style={{ textAlign: "center" }}>
                Ce lien de réinitialisation est invalide ou a expiré.
              </p>
              <p className="switch">
                <span
                  style={{ cursor: "pointer", color: "#a78bfa" }}
                  onClick={() => navigate("/forgot-password")}
                >
                  Demander un nouveau lien
                </span>
              </p>
            </>
          ) : (
            <>
              <form onSubmit={handleSubmit}>
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <input
                  type="password"
                  placeholder="Confirmer le mot de passe"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
                {error && <p className="error">{error}</p>}
                <button type="submit" disabled={loading}>
                  {loading ? "Enregistrement..." : "Enregistrer le mot de passe"}
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

export default ResetPassword;
