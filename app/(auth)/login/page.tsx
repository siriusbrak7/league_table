'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      router.push('/dashboard');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 sm:p-10 shadow-xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[var(--gold)] mb-2 font-bold">
          Physics League
        </p>
        <h1 className="text-xl font-black text-[var(--text-1)] tracking-tight">
          Sign In
        </h1>
        <p className="text-xs text-[var(--text-2)] mt-1">Teacher & Administrator Portal</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-[10px] font-mono uppercase tracking-widest text-[var(--text-2)] font-semibold mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@school.com"
            className="form-input text-sm font-medium"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-[10px] font-mono uppercase tracking-widest text-[var(--text-2)] font-semibold mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="form-input text-sm font-medium"
          />
        </div>

        {error && (
          <div className="alert-error text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center py-2.5 text-sm font-bold tracking-wide mt-2"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-[var(--border)] text-center text-[10px] font-mono text-[var(--text-3)] uppercase tracking-widest">
        Protected system
      </div>
    </div>
  );
}
