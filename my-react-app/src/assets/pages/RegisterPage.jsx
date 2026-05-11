import { useState } from "react";

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const INPUT_CLASS = `
  w-full border-2 border-black px-4 py-3 text-sm outline-none
  focus:bg-yellow-50 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-1
  dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-100
  dark:placeholder:text-zinc-500 dark:focus:bg-zinc-700
`;

const PRIMARY_BTN = `
  w-full border-2 border-black bg-yellow-400 px-4 py-3
  text-xs font-black uppercase tracking-[0.2em] text-black
  transition-all hover:bg-black hover:text-white
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-1
  disabled:cursor-not-allowed disabled:opacity-60
`;

function RegisterPage({ apiBaseUrl = DEFAULT_API_BASE_URL }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [isLoading, setIsLoading] = useState(false);

  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "Weak password: it must be at least 8 characters long.";
    }
    if (!/[A-Z]/.test(password)) {
      return "Weak password: include at least one uppercase letter.";
    }
    if (!/[a-z]/.test(password)) {
      return "Weak password: include at least one lowercase letter.";
    }
    if (!/[0-9]/.test(password)) {
      return "Weak password: include at least one number.";
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return "Weak password: include at least one special character.";
    }
    return "";
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    showMessage("");

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      showMessage(passwordError, "error");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      showMessage(data.message || "Registration complete.", response.ok ? "info" : "error");
    } catch (error) {
      console.error("Register error:", error);
      showMessage(
        "Could not connect to server. Check VITE_API_BASE_URL and make sure the backend is running.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
        Create an account to save favorites and personalize the app later.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate aria-label="Register form">
        <div className="space-y-2">
          <label htmlFor="register-username" className="block text-xs font-black uppercase tracking-[0.2em]">
            Username
          </label>
          <input
            id="register-username"
            className={INPUT_CLASS}
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            autoComplete="username"
            required
            aria-required="true"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="register-email" className="block text-xs font-black uppercase tracking-[0.2em]">
            Email
          </label>
          <input
            id="register-email"
            className={INPUT_CLASS}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
            aria-required="true"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="register-password" className="block text-xs font-black uppercase tracking-[0.2em]">
            Password
          </label>
          <input
            id="register-password"
            className={INPUT_CLASS}
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
            aria-required="true"
            aria-describedby="register-password-hint"
          />
          <p id="register-password-hint" className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
            Use 8+ characters with uppercase, lowercase, a number, and a special character.
          </p>
        </div>

        <button
          className={PRIMARY_BTN}
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? "Registering..." : "Register"}
        </button>
      </form>

      {message ? (
        <p
          role="status"
          aria-live="polite"
          className={`text-sm font-semibold ${messageType === "error" ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-zinc-200"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export default RegisterPage;