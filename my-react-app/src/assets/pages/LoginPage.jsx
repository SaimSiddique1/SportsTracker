import { useState } from "react";

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

function LoginPage({ apiBaseUrl = DEFAULT_API_BASE_URL }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
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
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleResetChange = (e) => {
    setResetForm({
      ...resetForm,
      [e.target.name]: e.target.value,
    });
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
        headers: {
          "Content-Type": "application/json",
        },
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

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json();
      setMessage(data.message || "Check your email for a password reset link.");

      if (response.ok) {
        setFormData((current) => ({ ...current, email: forgotEmail }));
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setMessage("Could not send the reset email. Make sure the backend and email settings are configured.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();

    if (resetForm.password !== resetForm.confirmPassword) {
      setMessage("New password and confirmation do not match.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: resetForm.email,
          token: resetForm.token,
          password: resetForm.password,
        }),
      });

      const data = await response.json();
      setMessage(data.message || "Password reset complete.");

      if (response.ok) {
        const cleanUrl = `${window.location.pathname}${window.location.hash}`;
        window.history.replaceState({}, "", cleanUrl || "/");
        setFormData({ email: resetForm.email, password: "" });
        setResetForm((current) => ({
          ...current,
          token: "",
          password: "",
          confirmPassword: "",
        }));
        setMode("login");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setMessage("Could not reset your password. Make sure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "forgot") {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-slate-600">
          Enter your account email and we will send a secure reset link.
        </p>

        <form className="space-y-4" onSubmit={handleForgotSubmit}>
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-[0.2em]">
              Email
            </label>
            <input
              className="w-full border-2 border-black px-4 py-3 text-sm outline-none focus:bg-yellow-50"
              type="email"
              name="forgotEmail"
              value={forgotEmail}
              onChange={(event) => setForgotEmail(event.target.value)}
              required
            />
          </div>

          <button
            className="w-full border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-yellow-400 hover:text-black"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Email"}
          </button>
        </form>

        <button
          className="text-xs font-black uppercase tracking-[0.2em] underline"
          type="button"
          onClick={() => {
            setMessage("");
            setMode("login");
          }}
        >
          Back to login
        </button>

        {message ? <p className="text-sm font-semibold">{message}</p> : null}
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-slate-600">
          Choose a new password for your verified email address.
        </p>

        <form className="space-y-4" onSubmit={handleResetSubmit}>
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-[0.2em]">
              Email
            </label>
            <input
              className="w-full border-2 border-black px-4 py-3 text-sm outline-none focus:bg-yellow-50"
              type="email"
              name="email"
              value={resetForm.email}
              onChange={handleResetChange}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-[0.2em]">
              New Password
            </label>
            <input
              className="w-full border-2 border-black px-4 py-3 text-sm outline-none focus:bg-yellow-50"
              type="password"
              name="password"
              value={resetForm.password}
              onChange={handleResetChange}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-[0.2em]">
              Confirm Password
            </label>
            <input
              className="w-full border-2 border-black px-4 py-3 text-sm outline-none focus:bg-yellow-50"
              type="password"
              name="confirmPassword"
              value={resetForm.confirmPassword}
              onChange={handleResetChange}
              required
            />
            <p className="text-[11px] font-semibold text-slate-500">
              Use 8+ characters with uppercase, lowercase, a number, and a special character.
            </p>
          </div>

          <button
            className="w-full border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-yellow-400 hover:text-black"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        {message ? <p className="text-sm font-semibold">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-600">
        Sign in with your account credentials.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-xs font-black uppercase tracking-[0.2em]">
            Email
          </label>
          <input
            className="w-full border-2 border-black px-4 py-3 text-sm outline-none focus:bg-yellow-50"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-black uppercase tracking-[0.2em]">
            Password
          </label>
          <input
            className="w-full border-2 border-black px-4 py-3 text-sm outline-none focus:bg-yellow-50"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
          />
        </div>

        <button
          className="w-full border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-yellow-400 hover:text-black"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>

      <button
        className="text-xs font-black uppercase tracking-[0.2em] underline"
        type="button"
        onClick={() => {
          setForgotEmail(formData.email);
          setMessage("");
          setMode("forgot");
        }}
      >
        Forgot password?
      </button>

      {message ? <p className="text-sm font-semibold">{message}</p> : null}
    </div>
  );
}

export default LoginPage;
