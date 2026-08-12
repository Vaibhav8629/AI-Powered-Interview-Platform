import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  success: {
    margin: 0,
    color: "#067647",
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

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }

    if (!emailPattern.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BASE_API}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || data?.msg || "Registration failed.");
      }

      setSuccess("Registration successful.");
      navigate("/login", { replace: true, state: { message: "Registration successful. Please log in." } });
    } catch (err) {
      setError(getAuthErrorMessage(err, "Registration failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Register</h1>
        {error ? <p style={styles.error}>{error}</p> : null}
        {success ? <p style={styles.success}>{success}</p> : null}
        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <div style={styles.field}>
            <label htmlFor="register-name" style={styles.label}>Name</label>
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="register-email" style={styles.label}>Email</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="register-password" style={styles.label}>Password</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={styles.input}
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.link}>Login</Link>
        </p>
      </div>
    </div>
  );
}