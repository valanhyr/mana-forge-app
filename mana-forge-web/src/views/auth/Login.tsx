import React, { useState } from "react";
import { useUser } from "../../services/UserContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const { login } = useUser();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate("/"); // Redirigir al dashboard tras login exitoso
    } catch (err) {
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          Iniciar Sesión
        </h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-2">
              Usuario
            </label>
            <input
              type="text"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              placeholder="Tu nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-orange-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-900/20 transition-all active:scale-95 mt-4"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
