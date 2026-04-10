import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

import stockImg from "./images/v.jpg";
import avatarImg from "./images/p.jpg";
import stockkImg from "./images/p.jpg";

function Login() {
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState("responsable");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 🚀 redirect by role
  const redirectByRole = (role) => {
    switch (role) {
      case "admin":
        navigate("/admin");
        break;
      case "magasinier":
        navigate("/products");
        break;
      case "responsable":
        navigate("/dashboard");
        break;
      default:
        navigate("/login");
    }
  };

  // 🔐 auto login (FIX JSON.parse error)
  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser || storedUser === "undefined") return;

    try {
      const user = JSON.parse(storedUser);
      if (user?.role) {
        redirectByRole(user.role);
      }
    } catch (err) {
      localStorage.removeItem("user");
    }
  }, []);

  // 🔐 LOGIN
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("الرجاء تعبئة كل الحقول");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Login failed");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));

      redirectByRole(data.user.role);
    } catch (err) {
      setError("خطأ في الاتصال بالسيرفر");
    }
  };

  // 🆕 REGISTER
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("الرجاء تعبئة كل الحقول");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Register failed");
        return;
      }

      // register يرجع id فقط
      const newUser = {
        id: data.id,
        email,
        role,
      };

      localStorage.setItem("user", JSON.stringify(newUser));

      redirectByRole(role);
    } catch (err) {
      setError("خطأ في الاتصال بالسيرفر");
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
        {/* LEFT */}
        <div className="login-brand">
          <h2>Gestion de Stock</h2>
          <p>Simple • Moderne • Efficace</p>
          <img src={stockImg} alt="stock" className="login-image" />
        </div>

        {/* RIGHT */}
        <div className="login-form">
          <img src={avatarImg} alt="avatar" className="login-avatar" />

          <h3>{isRegister ? "Créer un compte" : "Connexion"}</h3>

          {/* ROLES */}
          {isRegister && (
            <div className="role-select">
              <button
                type="button"
                className={role === "responsable" ? "active" : ""}
                onClick={() => setRole("responsable")}
              >
                Responsable
              </button>

              <button
                type="button"
                className={role === "magasinier" ? "active" : ""}
                onClick={() => setRole("magasinier")}
              >
                Magasinier
              </button>
            </div>
          )}

          <form onSubmit={isRegister ? handleRegister : handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <p className="error">{error}</p>}

            <button type="submit">
              {isRegister ? "Créer le compte" : "Se connecter"}
            </button>
          </form>

          <p className="switch">
            {isRegister
              ? "Vous avez déjà un compte ?"
              : "Vous n’avez pas de compte ?"}
            <span onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? " Se connecter" : " Créer un compte"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;