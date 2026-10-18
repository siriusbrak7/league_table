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
    <div className="border border-[#1f1f27] bg-[#111115] rounded p-8 sm:p-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#55555f] mb-2">
          Physics League
        </p>
        <h1 className="text-xl font-black text-white tracking-tight">
          Sign In
        </h1>
        <p className="text-xs text-[#8b8b9a] mt-1">Teacher & Administrator Portal</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-[10px] font-mono uppercase tracking-widest text-[#55555f] mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teacher@school.com"
            className="w-full px-3 py-2.5 bg-[#0c0c0e] border border-[#2a2a35] text-[#f0f0f2] placeholder-[#3a3a48] rounded text-sm font-medium focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-[10px] font-mono uppercase tracking-widest text-[#55555f] mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-2.5 bg-[#0c0c0e] border border-[#2a2a35] text-[#f0f0f2] placeholder-[#3a3a48] rounded text-sm font-medium focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        {error && (
          <div className="text-xs text-red-400 border border-red-900/50 bg-red-950/20 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded tracking-wide transition-colors disabled:opacity-40 cursor-pointer mt-2"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-[#1f1f27] text-center text-[10px] font-mono text-[#3a3a48] uppercase tracking-widest">
        Protected system
      </div>
    </div>
  );
}
