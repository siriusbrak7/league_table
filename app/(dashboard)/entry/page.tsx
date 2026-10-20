'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { EntryForm } from '@/components/dashboard/entry-form';
import { PenTool, AlertCircle } from 'lucide-react';
import type { Student } from '@/types';

export default function EntryPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchStudents() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .order('grade')
          .order('name');
        if (error) throw error;
        setStudents(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load students');
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full border-2 border-[var(--border)] border-t-[var(--gold)] animate-spin" />
          <p className="text-[var(--text-2)] text-sm font-medium">Loading roster & score sheets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="alert-error max-w-md text-center p-6 flex flex-col items-center">
          <AlertCircle className="w-6 h-6 text-[var(--danger)] mb-2" />
          <p className="font-semibold text-sm">Failed to load data</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 space-y-7 max-w-6xl mx-auto">
      <div className="border-b border-[var(--border)] pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="eyebrow flex items-center gap-1.5 text-[var(--gold)]">
            <PenTool className="w-3.5 h-3.5" />
            Score Administration
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-1)]">
          Score Entry
        </h1>
        <p className="text-sm text-[var(--text-2)] mt-1">
          Record weekly academic results and conduct ratings by grade level.
        </p>
      </div>
      <EntryForm students={students} />
    </div>
  );
}
