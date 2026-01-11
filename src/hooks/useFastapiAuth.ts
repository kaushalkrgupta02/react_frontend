import { useState } from 'react';
import { signUp, signIn, getMe, signOut } from '../lib/authApi';

export function useFastapiAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fastapiSignUp = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await signUp(payload);
      return res;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const fastapiSignIn = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await signIn(payload);
      localStorage.setItem('access_token', res.session.access_token);
      localStorage.setItem('refresh_token', res.session.refresh_token);
      setUser(res.user);
      return res;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const fastapiGetMe = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('No access token');
      const res = await getMe(token);
      setUser(res);
      return res;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const fastapiSignOut = () => {
    signOut();
    setUser(null);
  };

  return {
    user,
    loading,
    error,
    fastapiSignUp,
    fastapiSignIn,
    fastapiGetMe,
    fastapiSignOut,
  };
}
