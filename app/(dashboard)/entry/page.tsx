'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { EntryForm } from '@/components/dashboard/entry-form';
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
        <p className="text-gray-600">Loading students...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Data Entry</h1>

        {/* Unified Entry Form */}
        <EntryForm students={students} />
      </div>
    </div>
  );
}
