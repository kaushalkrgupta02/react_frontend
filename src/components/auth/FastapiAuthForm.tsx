import { useState } from 'react';
import { useFastapiAuth } from '../../hooks/useFastapiAuth';

export default function FastapiAuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const { fastapiSignIn, fastapiSignUp, loading, error, user } = useFastapiAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === 'signin') {
        await fastapiSignIn({ email, password });
      } else {
        await fastapiSignUp({ email, password });
      }
    } catch {}
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: 'auto' }}>
      <h2>{mode === 'signin' ? 'Sign In' : 'Sign Up'} (FastAPI)</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        style={{ display: 'block', marginBottom: 8, width: '100%' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        style={{ display: 'block', marginBottom: 8, width: '100%' }}
      />
      <button type="submit" disabled={loading}>
        {loading ? (mode === 'signin' ? 'Signing In...' : 'Signing Up...') : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
      </button>
      <button type="button" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} style={{ marginLeft: 8 }}>
        Switch to {mode === 'signin' ? 'Sign Up' : 'Sign In'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {user && <div style={{ color: 'green', marginTop: 8 }}>Signed in as {user.email}</div>}
    </form>
  );
}
