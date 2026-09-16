'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GRADES } from '@/lib/config';
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

  const generateTokenForGrade = async (grade: string) => {
    try {
      setUpdatingGrade(grade);
      setError(null);

      // Secure 32-character hex token using crypto.randomUUID
      const newToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);

      const existing = tokens[grade];

      if (existing) {
        const { data, error } = await supabase
          .from('grade_tokens')
          .update({ token: newToken, updated_at: new Date().toISOString() })
          .eq('grade', grade)
          .select()
          .single();

        if (error) throw error;
        setTokens((prev) => ({ ...prev, [grade]: data }));
      } else {
        const { data, error } = await supabase
          .from('grade_tokens')
          .insert([{ grade, token: newToken }])
          .select()
          .single();

        if (error) throw error;
        setTokens((prev) => ({ ...prev, [grade]: data }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate token');
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
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Student Public Links</h1>
        <p className="text-gray-600 text-sm">
          Generate per-grade public access links for students and parents to view their grade&apos;s live league standings.
        </p>

        {/* Warning Banner */}
        <div className="mt-4 bg-amber-50 border border-amber-300 rounded-lg p-4 text-amber-800 text-sm flex items-start gap-3">
          <span className="text-lg leading-none">⚠️</span>
          <div>
            <span className="font-bold">Important Warning:</span> Regenerating a token will immediately break the old link for all students using it.
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm font-medium">
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Loading student access links...
        </div>
      ) : (
        <div className="space-y-4">
          {GRADES.map((grade) => {
            const tokenRecord = tokens[grade];
            const hasToken = Boolean(tokenRecord?.token);
            const fullUrl = hasToken ? `${baseUrl}/league/${tokenRecord.token}` : '';

            return (
              <div
                key={grade}
                className="bg-white rounded-lg shadow p-5 border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">Grade {grade}</span>
                    {hasToken ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                        Active Token
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600">
                        No Token Yet
                      </span>
                    )}
                  </div>

                  {hasToken ? (
                    <div className="font-mono text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded break-all max-w-2xl select-all">
                      {fullUrl}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No public access URL generated for this grade.</p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {hasToken && (
                    <button
                      onClick={() => copyToClipboard(grade, fullUrl)}
                      className="px-4 py-2 bg-gray-100 text-gray-800 font-semibold text-sm rounded-lg hover:bg-gray-200 border border-gray-300 transition cursor-pointer"
                    >
                      {copiedGrade === grade ? '✓ Copied!' : 'Copy URL'}
                    </button>
                  )}

                  <button
                    onClick={() => generateTokenForGrade(grade)}
                    disabled={updatingGrade === grade}
                    className={`px-4 py-2 font-semibold text-sm rounded-lg text-white transition cursor-pointer shadow-sm ${
                      hasToken
                        ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400'
                        : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400'
                    }`}
                  >
                    {updatingGrade === grade
                      ? 'Generating...'
                      : hasToken
                      ? 'Regenerate Token'
                      : 'Generate Token'}
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
