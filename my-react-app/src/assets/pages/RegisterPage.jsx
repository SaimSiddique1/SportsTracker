import { useState } from "react";

function RegisterPage({ apiBaseUrl = "http://localhost:5001" }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setMessage(data.message || "Registration complete.");
    } catch (error) {
      console.error("Register error:", error);
      setMessage("Could not connect to server. Make sure the backend is running on port 5001.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-600">
        Create an account to save favorites and personalize the app later.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-xs font-black uppercase tracking-[0.2em]">
            Username
          </label>
          <input
            className="w-full border-2 border-black px-4 py-3 text-sm outline-none focus:bg-yellow-50"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
          />
        </div>

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
          <p className="text-[11px] font-semibold text-slate-500">
            Use 8+ characters with uppercase, lowercase, a number, and a special character.
          </p>
        </div>

        <button
          className="w-full border-2 border-black bg-yellow-400 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-black hover:text-white"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Registering..." : "Register"}
        </button>
      </form>

      {message ? <p className="text-sm font-semibold">{message}</p> : null}
    </div>
  );
}

export default RegisterPage;
