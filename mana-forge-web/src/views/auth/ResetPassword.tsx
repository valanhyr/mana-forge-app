import React, {useState, useEffect} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {toast} from '../../services/ToastContext';
import api from '../../services/api';

export default function ResetPassword(){
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(()=>{
    if(!token) {
      toast.error('Enlace inválido');
      navigate('/login');
    }
  },[token, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(password.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres');
    if(password !== confirm) return toast.error('Las contraseñas no coinciden');
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      toast.success('Contraseña cambiada. Puedes iniciar sesión con la nueva contraseña.');
      navigate('/login');
    } catch(err){
      toast.error('Token inválido o expirado');
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Restablecer contraseña</h1>
      <form onSubmit={submit}>
        <label className="block mb-2">Nueva contraseña</label>
        <input type="password" className="w-full p-2 border rounded mb-4" value={password} onChange={e=>setPassword(e.target.value)} required />
        <label className="block mb-2">Confirmar contraseña</label>
        <input type="password" className="w-full p-2 border rounded mb-4" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
        <button className="bg-orange-600 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Enviando...' : 'Cambiar contraseña'}</button>
      </form>
    </div>
  );
}
