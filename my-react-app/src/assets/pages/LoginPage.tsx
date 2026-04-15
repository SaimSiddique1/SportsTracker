import { useState } from "react";

type LoginPageProps = {
  apiBaseUrl?: string;
};

function LoginPage({ apiBaseUrl = "http://localhost:5000" }: LoginPageProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
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
      }

      setMessage(data.message || "Login complete.");
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Could not connect to server. Make sure the backend is running on port 5001.");
    } finally {
      setIsLoading(false);
    }
  };

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

      {message ? <p className="text-sm font-semibold">{message}</p> : null}
    </div>
  );
}

export default LoginPage;
