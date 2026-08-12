import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BASE_API = import.meta.env.VITE_BASE_API;

function getAuthErrorMessage(error, fallbackMessage) {
  return error instanceof Error && error.message ? error.message : fallbackMessage;
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    backgroundColor: "#f5f7f8",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    backgroundColor: "#ffffff",
    border: "1px solid #d9e2e0",
    borderRadius: "12px",
    padding: "28px",
    boxShadow: "0 8px 24px rgba(10, 31, 23, 0.08)",
  },
  title: {
    margin: "0 0 18px",
    fontSize: "28px",
    lineHeight: 1.2,
    color: "#0a1f17",
  },
  form: {
    display: "grid",
    gap: "14px",
  },
  field: {
    display: "grid",
    gap: "6px",
  },
  label: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#214236",
  },
  input: {
    width: "100%",
    border: "1px solid #c8d6d1",
    borderRadius: "8px",
    padding: "11px 12px",
    fontSize: "15px",
    color: "#0a1f17",
    backgroundColor: "#ffffff",
    outline: "none",
  },
  button: {
    border: "none",
    borderRadius: "8px",
    padding: "12px 14px",
    backgroundColor: "#0f5f49",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    margin: 0,
    color: "#b42318",
    fontSize: "14px",
  },
  footer: {
    marginTop: "16px",
    fontSize: "14px",
    color: "#3a554c",
    textAlign: "center",
  },
  link: {
    color: "#0f5f49",
    fontWeight: 600,
    textDecoration: "none",
  },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const successMessage = location.state?.message;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    if (!emailPattern.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BASE_API}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || data?.msg || "Login failed.");
      }

      const token = data?.token;

      if (token) {
        localStorage.setItem("token", token);
      }

      navigate("/", { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err, "Login failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Login</h1>
        {successMessage ? <p style={{ ...styles.error, color: "#067647" }}>{successMessage}</p> : null}
        {error ? <p style={styles.error}>{error}</p> : null}
        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <div style={styles.field}>
            <label htmlFor="login-email" style={styles.label}>Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="login-password" style={styles.label}>Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={styles.input}
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account? <Link to="/register" style={styles.link}>Register</Link>
        </p>
      </div>
    </div>
  );
}