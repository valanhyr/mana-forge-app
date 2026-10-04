import React, {useState} from 'react';
import {toast} from '../../services/ToastContext';
import api from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      toast.success('Si existe una cuenta con ese email, hemos enviado un enlace para resetear la contraseña.');
      setEmail('');
    } catch (err) {
      // generic message to avoid leak
      toast.error('Si existe una cuenta con ese email, hemos enviado un enlace para resetear la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Recuperar contraseña</h1>
      <form onSubmit={submit}>
        <label className="block mb-2">Email</label>
        <input type="email" className="w-full p-2 border rounded mb-4" value={email} onChange={e=>setEmail(e.target.value)} required />
        <button className="bg-orange-600 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>
    </div>
  );
}
