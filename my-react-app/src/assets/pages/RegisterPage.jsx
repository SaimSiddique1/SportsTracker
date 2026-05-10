import { useState } from "react";

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const inputCls =
  "w-full border-2 border-black bg-white px-4 py-3 text-sm text-black outline-none focus:bg-yellow-50 " +
  "dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:bg-zinc-700";

const labelCls = "block text-xs font-black uppercase tracking-[0.2em] dark:text-zinc-300";

const validatePassword = (password) => {
  if (password.length < 8) return "Weak password: it must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Weak password: include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Weak password: include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Weak password: include at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Weak password: include at least one special character.";
  return "";
};

function RegisterPage({ apiBaseUrl = DEFAULT_API_BASE_URL }) {
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setMessage(passwordError);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      setMessage(data.message || "Registration complete.");
    } catch (error) {
      console.error("Register error:", error);
      setMessage("Could not connect to server. Check VITE_API_BASE_URL and make sure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
        Create an account to save favorites and personalize the app later.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="register-username" className={labelCls}>Username</label>
          <input
            id="register-username"
            className={inputCls}
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            autoComplete="username"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="register-email" className={labelCls}>Email</label>
          <input
            id="register-email"
            className={inputCls}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="register-password" className={labelCls}>Password</label>
          <input
            id="register-password"
            className={inputCls}
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
            aria-describedby="register-password-hint"
          />
          <p id="register-password-hint" className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
            Use 8+ characters with uppercase, lowercase, a number, and a special character.
          </p>
        </div>

        <button
          className="
            w-full border-2 border-black bg-yellow-400 px-4 py-3 text-xs font-black uppercase
            tracking-[0.2em] text-black transition-all
            hover:bg-black hover:text-white
            focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
            disabled:opacity-50
          "
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Registering…" : "Register"}
        </button>
      </form>

      {message && (
        <p role="status" aria-live="polite" className="text-sm font-semibold dark:text-zinc-300">
          {message}
        </p>
      )}
    </div>
  );
}

export default RegisterPage;