import { useState } from "react";

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const INPUT_CLASS = `
  w-full border-2 border-black px-4 py-3 text-sm outline-none
  focus:bg-yellow-50 focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-1
  dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-100
  dark:placeholder:text-zinc-500 dark:focus:bg-zinc-700
`;

const PRIMARY_BTN = `
  w-full border-2 border-black bg-black px-4 py-3
  text-xs font-black uppercase tracking-[0.2em] text-white
  transition-all hover:bg-yellow-400 hover:text-black
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-1
  disabled:cursor-not-allowed disabled:opacity-60
`;

const LINK_BTN = `
  text-xs font-black uppercase tracking-[0.2em] underline underline-offset-2
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-1
  dark:text-zinc-300
`;

function LoginPage({ apiBaseUrl = DEFAULT_API_BASE_URL }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetForm, setResetForm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      email: params.get("email") || "",
      token: params.get("resetToken") || "",
      password: "",
      confirmPassword: "",
    };
  });
  const [mode, setMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("resetToken") ? "reset" : "login";
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [isLoading, setIsLoading] = useState(false);

  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleResetChange = (e) => {
    setResetForm({ ...resetForm, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    showMessage("");

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

      showMessage(data.message || "Login complete.", response.ok ? "info" : "error");
    } catch (error) {
      console.error("Login error:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-changed"));
      showMessage(
        "Could not connect to server. Check VITE_API_BASE_URL and make sure the backend is running.",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    showMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json();
      showMessage(data.message || "Check your email for a password reset link.", response.ok ? "info" : "error");
      if (response.ok) setFormData((c) => ({ ...c, email: forgotEmail }));
    } catch (error) {
      console.error("Forgot password error:", error);
      showMessage("Could not send the reset email. Make sure the backend and email settings are configured.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (resetForm.password !== resetForm.confirmPassword) {
      showMessage("New password and confirmation do not match.", "error");
      return;
    }
    setIsLoading(true);
    showMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetForm.email, token: resetForm.token, password: resetForm.password }),
      });
      const data = await response.json();
      showMessage(data.message || "Password reset complete.", response.ok ? "info" : "error");

      if (response.ok) {
        const cleanUrl = `${window.location.pathname}${window.location.hash}`;
        window.history.replaceState({}, "", cleanUrl || "/");
        setFormData({ email: resetForm.email, password: "" });
        setResetForm((c) => ({ ...c, token: "", password: "", confirmPassword: "" }));
        setMode("login");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      showMessage("Could not reset your password. Make sure the backend is running.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const StatusMessage = () =>
    message ? (
      <p
        role="status"
        aria-live="polite"
        className={`text-sm font-semibold ${messageType === "error" ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-zinc-200"}`}
      >
        {message}
      </p>
    ) : null;

  if (mode === "forgot") {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
          Enter your account email and we will send a secure reset link.
        </p>

        <form className="space-y-4" onSubmit={handleForgotSubmit} noValidate aria-label="Forgot password form">
          <div className="space-y-2">
            <label htmlFor="forgot-email" className="block text-xs font-black uppercase tracking-[0.2em]">
              Email
            </label>
            <input
              id="forgot-email"
              className={INPUT_CLASS}
              type="email"
              name="forgotEmail"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              autoComplete="email"
              required
              aria-required="true"
            />
          </div>

          <button className={PRIMARY_BTN} type="submit" disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? "Sending…" : "Send Reset Email"}
          </button>
        </form>

        <button
          className={LINK_BTN}
          type="button"
          onClick={() => { showMessage(""); setMode("login"); }}
        >
          ← Back to login
        </button>

        <StatusMessage />
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
          Choose a new password for your verified email address.
        </p>

        <form className="space-y-4" onSubmit={handleResetSubmit} noValidate aria-label="Reset password form">
          <div className="space-y-2">
            <label htmlFor="reset-email" className="block text-xs font-black uppercase tracking-[0.2em]">
              Email
            </label>
            <input
              id="reset-email"
              className={INPUT_CLASS}
              type="email"
              name="email"
              value={resetForm.email}
              onChange={handleResetChange}
              autoComplete="email"
              required
              aria-required="true"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reset-new-password" className="block text-xs font-black uppercase tracking-[0.2em]">
              New Password
            </label>
            <input
              id="reset-new-password"
              className={INPUT_CLASS}
              type="password"
              name="password"
              value={resetForm.password}
              onChange={handleResetChange}
              autoComplete="new-password"
              required
              aria-required="true"
              aria-describedby="reset-password-hint"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="reset-confirm-password" className="block text-xs font-black uppercase tracking-[0.2em]">
              Confirm Password
            </label>
            <input
              id="reset-confirm-password"
              className={INPUT_CLASS}
              type="password"
              name="confirmPassword"
              value={resetForm.confirmPassword}
              onChange={handleResetChange}
              autoComplete="new-password"
              required
              aria-required="true"
            />
            <p id="reset-password-hint" className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
              Use 8+ characters with uppercase, lowercase, a number, and a special character.
            </p>
          </div>

          <button className={PRIMARY_BTN} type="submit" disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? "Resetting…" : "Reset Password"}
          </button>
        </form>

        <StatusMessage />
      </div>
    );
  }

  // Default: login
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
        Sign in with your account credentials.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate aria-label="Login form">
        <div className="space-y-2">
          <label htmlFor="login-email" className="block text-xs font-black uppercase tracking-[0.2em]">
            Email
          </label>
          <input
            id="login-email"
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
          <label htmlFor="login-password" className="block text-xs font-black uppercase tracking-[0.2em]">
            Password
          </label>
          <input
            id="login-password"
            className={INPUT_CLASS}
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
            aria-required="true"
          />
        </div>

        <button className={PRIMARY_BTN} type="submit" disabled={isLoading} aria-busy={isLoading}>
          {isLoading ? "Logging in…" : "Login"}
        </button>
      </form>

      <button
        className={LINK_BTN}
        type="button"
        onClick={() => {
          setForgotEmail(formData.email);
          showMessage("");
          setMode("forgot");
        }}
      >
        Forgot password?
      </button>

      <StatusMessage />
    </div>
  );
}

export default LoginPage;