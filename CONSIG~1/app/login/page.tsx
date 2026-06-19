'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const BLUE = '#2b5b83';
const GREEN = '#85c674';
const TEXT = '#1e293b';
const TEXT2 = '#64748b';
const BORDER = '#e2e8f0';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) { router.replace('/inbox'); return; }
        setNeedsSetup(Boolean(d.needsSetup));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) { setError('Preencha usuário e senha.'); return; }
    if (needsSetup && password !== password2) { setError('As senhas não coincidem.'); return; }
    setBusy(true);
    try {
      const res = await fetch(needsSetup ? '/api/auth/setup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao entrar.'); setBusy(false); return; }
      router.replace('/inbox');
    } catch {
      setError('Erro ao conectar. Tente novamente.');
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8' }}>
        <span style={{ color: TEXT2, fontSize: 13 }}>Carregando...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f4f8', padding: 16, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, boxShadow: '0 8px 30px rgba(15,23,42,.08)', padding: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>G</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 17, color: TEXT }}>GranaTech</div>
          <div style={{ fontSize: 12, color: TEXT2, marginTop: 2 }}>
            {needsSetup ? 'Crie a conta administradora inicial' : 'Acesse sua conta'}
          </div>
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: TEXT2, display: 'block', marginBottom: 5 }}>Usuário</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: admin"
              style={{ width: '100%', background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 11px', fontSize: 13, outline: 'none', boxSizing: 'border-box', color: TEXT }} />
          </div>
          <div style={{ marginBottom: needsSetup ? 12 : 18 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: TEXT2, display: 'block', marginBottom: 5 }}>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              style={{ width: '100%', background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 11px', fontSize: 13, outline: 'none', boxSizing: 'border-box', color: TEXT }} />
          </div>
          {needsSetup && (
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11.5, fontWeight: 600, color: TEXT2, display: 'block', marginBottom: 5 }}>Confirmar senha</label>
              <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="••••••••"
                style={{ width: '100%', background: '#f8fafc', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 11px', fontSize: 13, outline: 'none', boxSizing: 'border-box', color: TEXT }} />
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 11.5, borderRadius: 7, padding: '8px 10px', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={busy}
            style={{ width: '100%', background: GREEN, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 13.5, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Entrando...' : needsSetup ? 'Criar conta e entrar' : 'Entrar'}
          </button>
        </form>

        {needsSetup && (
          <div style={{ marginTop: 16, fontSize: 11, color: TEXT2, textAlign: 'center', lineHeight: 1.5 }}>
            Esta será a conta principal (admin) da plataforma.<br />Você poderá criar acessos para parceiros depois, em Configurações.
          </div>
        )}
      </div>
    </div>
  );
}
