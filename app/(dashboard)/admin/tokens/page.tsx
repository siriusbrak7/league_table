'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GRADES } from '@/lib/config';
import { KeyRound, ShieldAlert, Check, Copy, RefreshCw } from 'lucide-react';
import type { GradeToken } from '@/types';

export default function AdminTokensPage() {
  const [tokens, setTokens] = useState<Record<string, GradeToken>>({});
  const [loading, setLoading] = useState(true);
  const [updatingGrade, setUpdatingGrade] = useState<string | null>(null);
  const [copiedGrade, setCopiedGrade] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://league-table-five.vercel.app';

  useEffect(() => {
    async function fetchTokens() {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('grade_tokens').select('*');
        if (error) throw error;

        const tokenMap: Record<string, GradeToken> = {};
        (data || []).forEach((row: GradeToken) => {
          tokenMap[row.grade] = row;
        });

        setTokens(tokenMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load grade tokens');
      } finally {
        setLoading(false);
      }
    }

    fetchTokens();
  }, [supabase]);

  const generateCodeForGrade = async (grade: string) => {
    try {
      setUpdatingGrade(grade);
      setError(null);

      // Derive a lowercase, alphanumeric four-character code from a UUID.
      const newCode = crypto.randomUUID().replace(/-/g, '').slice(0, 4).toLowerCase();

      const existing = tokens[grade];

      if (existing) {
        const { data, error } = await supabase
          .from('grade_tokens')
          .update({ code: newCode, updated_at: new Date().toISOString() })
          .eq('grade', grade)
          .select()
          .single();

        if (error) throw error;
        setTokens((prev) => ({ ...prev, [grade]: data }));
      } else {
        const { data, error } = await supabase
          .from('grade_tokens')
          .insert([{ grade, token: crypto.randomUUID().replace(/-/g, ''), code: newCode }])
          .select()
          .single();

        if (error) throw error;
        setTokens((prev) => ({ ...prev, [grade]: data }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate code');
    } finally {
      setUpdatingGrade(null);
    }
  };

  const copyToClipboard = (grade: string, fullUrl: string) => {
    navigator.clipboard.writeText(fullUrl);
    setCopiedGrade(grade);
    setTimeout(() => setCopiedGrade(null), 2000);
  };

  return (
    <div className="py-2 space-y-7 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="eyebrow flex items-center gap-1.5 text-[var(--gold)]">
            <KeyRound className="w-3.5 h-3.5" />
            Access Control
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-1)]">
          Public Leaderboard Links
        </h1>
        <p className="text-sm text-[var(--text-2)] mt-1">
          Issue tokenized, read-only links for students and parents to view their grade&apos;s live leaderboard.
        </p>

        {/* Security Alert */}
        <div className="mt-4 border border-[var(--warning)]/30 bg-[var(--warning)]/10 rounded-xl p-3.5 text-xs text-[var(--warning)] flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Security Note:</strong> Regenerating a code invalidates the prior link immediately. Any student or guardian bookmarking the previous link will lose access until provided the updated address.
          </div>
        </div>
      </div>

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-4 text-xs text-red-300">
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="border border-[var(--border)] bg-[var(--surface)] rounded-xl p-12 text-center text-[var(--text-2)]">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--gold)] animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono">Loading access tokens...</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {GRADES.map((grade) => {
            const tokenRecord = tokens[grade];
            const hasCode = Boolean(tokenRecord?.code);
            const fullUrl = hasCode ? `${baseUrl}/league/grade-${grade}-${tokenRecord.code}` : '';

            return (
              <div
                key={grade}
                className="border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-2)] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-[var(--text-1)] uppercase tracking-wide">
                      Grade {grade}
                    </span>
                    {hasCode ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold bg-[var(--surface-2)] text-[var(--text-3)] border border-[var(--border)]">
                        UNPUBLISHED
                      </span>
                    )}
                  </div>

                  {hasCode ? (
                    <div className="font-mono text-xs bg-[var(--surface-2)] border border-[var(--border)] px-3.5 py-2.5 rounded-lg break-all max-w-2xl">
                      <div className="text-[var(--gold)] font-medium select-all">{fullUrl}</div>
                      <p className="mt-1 text-[11px] text-[var(--text-3)]">
                        Public link for Grade {grade}. Regenerate anytime to reset access.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-3)] italic">
                      No public link has been generated for Grade {grade} yet.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {hasCode && (
                    <button
                      onClick={() => copyToClipboard(grade, fullUrl)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 font-mono text-xs rounded-lg border transition-colors cursor-pointer ${
                        copiedGrade === grade
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                          : 'bg-[var(--surface-2)] text-[var(--text-1)] border-[var(--border)] hover:border-[var(--gold)]'
                      }`}
                    >
                      {copiedGrade === grade ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Link
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => generateCodeForGrade(grade)}
                    disabled={updatingGrade === grade}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 font-mono text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-40 ${
                      hasCode
                        ? 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--border-2)]'
                        : 'bg-[var(--gold)] hover:bg-[#e0a520] text-black font-bold'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${updatingGrade === grade ? 'animate-spin' : ''}`} />
                    {updatingGrade === grade
                      ? 'Generating...'
                      : hasCode
                      ? 'Regenerate Code'
                      : 'Generate Link'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
