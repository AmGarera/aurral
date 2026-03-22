import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock } from 'lucide-react';
import { requestPlexPin, checkPlexPin } from '../utils/api';

const POLL_INTERVAL_MS = 2000;

const Login = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [plexLoading, setPlexLoading] = useState(false);
  const { login, plexLogin, plexAuthEnabled } = useAuth();
  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const username = localStorage.getItem('auth_user') || 'admin';
    const success = await login(password, username);

    if (success) {
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  const handlePlexLogin = async () => {
    setError('');
    setPlexLoading(true);
    try {
      const { id, authUrl } = await requestPlexPin();

      const popup = window.open(
        authUrl,
        'plex-auth',
        'width=800,height=700,scrollbars=yes,resizable=yes',
      );

      pollRef.current = setInterval(async () => {
        try {
          const result = await checkPlexPin(id);
          if (result.status === 'success') {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setPlexLoading(false);
            if (popup && !popup.closed) popup.close();
            plexLogin(result.token);
          } else if (popup && popup.closed) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setPlexLoading(false);
            setError('Plex sign-in was cancelled');
          }
        } catch (err) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPlexLoading(false);
          setError(err.response?.data?.error || 'Plex sign-in failed');
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      setPlexLoading(false);
      setError(err.response?.data?.error || 'Failed to start Plex sign-in');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white">
            Login Required
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Please sign in to access Aurral
          </p>
        </div>

        {plexAuthEnabled && (
          <div>
            <button
              type="button"
              onClick={handlePlexLogin}
              disabled={plexLoading}
              className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#e5a00d] hover:bg-[#cc8f0b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e5a00d] transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {plexLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Waiting for Plex…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm3.318 14.933L9.1 19.367V4.633l6.218 4.434-6.218 4.433 6.218 4.433z" />
                  </svg>
                  Sign in with Plex
                </>
              )}
            </button>
          </div>
        )}

        {plexAuthEnabled && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                or
              </span>
            </div>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
