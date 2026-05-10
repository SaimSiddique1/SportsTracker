import { useState } from "react";

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const inputCls =
  "w-full border-2 border-black bg-white px-4 py-3 text-sm text-black outline-none focus:bg-yellow-50 " +
  "dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:bg-zinc-700";

const labelCls = "block text-xs font-black uppercase tracking-[0.2em] dark:text-zinc-300";

function LoginPage({ apiBaseUrl = DEFAULT_API_BASE_URL }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("auth-changed"));
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth-changed"));
      }
      setMessage(data.message || "Login complete.");
    } catch (error) {
      console.error("Login error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-changed"));
      setMessage("Could not connect to server. Check VITE_API_BASE_URL and make sure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
        Sign in with your account credentials.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="login-email" className={labelCls}>Email</label>
          <input
            id="login-email"
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
          <label htmlFor="login-password" className={labelCls}>Password</label>
          <input
            id="login-password"
            className={inputCls}
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
        </div>

        <button
          className="
            w-full border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase
            tracking-[0.2em] text-white transition-all
            hover:bg-yellow-400 hover:text-black
            focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-yellow-400
            disabled:opacity-50
            dark:border-zinc-600 dark:bg-zinc-700 dark:hover:bg-yellow-400 dark:hover:text-black
          "
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Logging in…" : "Login"}
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

export default LoginPage;