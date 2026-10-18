'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Filter, Users, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { StudentForm } from '@/components/students/student-form';
import { StudentList } from '@/components/students/student-list';
import { GRADES } from '@/lib/config';
import type { Student } from '@/types';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [nameSearch, setNameSearch] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const supabase = useMemo(() => createClient(), []);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .order('grade')
        .order('name');

      if (fetchError) throw fetchError;
      setStudents(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents, refreshTrigger]);

  // Client-side filtering ensures instant response and eliminates any type mismatch issues
  const visibleStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesGrade =
        gradeFilter === 'All' || String(s.grade).trim() === String(gradeFilter).trim();
      const matchesName =
        !nameSearch.trim() ||
        s.name.toLowerCase().includes(nameSearch.trim().toLowerCase());
      return matchesGrade && matchesName;
    });
  }, [students, gradeFilter, nameSearch]);

  const handleCreateOrUpdate = async (formData: { name: string; grade: string }) => {
    setIsSubmitting(true);
    try {
      if (editingStudent) {
        const { error: updateError } = await supabase
          .from('students')
          .update({ name: formData.name, grade: formData.grade })
          .eq('id', editingStudent.id);
        if (updateError) throw updateError;
        setEditingStudent(null);
      } else {
        const { error: insertError } = await supabase
          .from('students')
          .insert([{ name: formData.name, grade: formData.grade }]);
        if (insertError) throw insertError;
      }
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save student');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${name}? This will remove the student from the database.`
    );
    if (!confirmed) return;
    try {
      setIsSubmitting(true);
      const { error: deleteError } = await supabase.from('students').delete().eq('id', id);
      if (deleteError) throw deleteError;
      if (editingStudent?.id === id) setEditingStudent(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasActiveFilters = gradeFilter !== 'All' || nameSearch.trim() !== '';

  return (
    <div className="py-2 space-y-7 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="border-b border-[var(--border)] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="eyebrow flex items-center gap-1.5 text-[var(--gold)]">
              <Users className="w-3.5 h-3.5" />
              Roster Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-1)]">
            Students
          </h1>
          <p className="text-sm text-[var(--text-2)] mt-1">
            Maintain the active student register for Grades 7–11.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-2)]">
            Total Enrolled: <strong className="text-[var(--text-1)] font-semibold">{students.length}</strong>
          </div>
          <button
            onClick={() => setRefreshTrigger((p) => p + 1)}
            disabled={loading}
            className="p-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors cursor-pointer"
            title="Refresh student list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--gold)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      <StudentForm
        key={editingStudent ? editingStudent.id : 'new'}
        initialData={editingStudent}
        onSubmit={handleCreateOrUpdate}
        onCancel={() => setEditingStudent(null)}
        isLoading={isSubmitting}
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>Error: {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400 hover:text-white underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search student by name..."
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-1)] placeholder-[var(--text-3)] rounded-lg text-sm focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--text-3)] shrink-0 hidden sm:block" />
            <span className="text-xs text-[var(--text-3)] uppercase tracking-wider font-semibold whitespace-nowrap">
              Grade:
            </span>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-1)] rounded-lg text-sm focus:outline-none focus:border-[var(--gold)] cursor-pointer transition-colors"
            >
              <option value="All">All Grades</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setGradeFilter('All');
                  setNameSearch('');
                }}
                className="px-3 py-2 text-xs font-medium text-[var(--text-2)] hover:text-[var(--gold)] hover:bg-[var(--surface-2)] rounded-lg border border-transparent hover:border-[var(--border)] transition-all cursor-pointer whitespace-nowrap"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filter results summary */}
        <div className="flex items-center justify-between text-xs text-[var(--text-3)] pt-1 border-t border-[var(--border)]">
          <span>
            Showing <strong className="text-[var(--text-1)] font-medium">{visibleStudents.length}</strong> of{' '}
            <strong className="text-[var(--text-1)] font-medium">{students.length}</strong> students
          </span>
          {hasActiveFilters && (
            <span className="text-[var(--gold)]">
              Filtered {gradeFilter !== 'All' ? `by Grade ${gradeFilter}` : ''}
              {gradeFilter !== 'All' && nameSearch ? ' & ' : ''}
              {nameSearch ? `query "${nameSearch}"` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Student List Table */}
      {loading ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-[var(--text-3)]">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--gold)] animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--text-2)]">Loading roster...</p>
        </div>
      ) : (
        <StudentList
          students={visibleStudents}
          onEdit={(student) => {
            setEditingStudent(student);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onDelete={handleDelete}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
}
