'use client';

import { useState } from 'react';
import { UserCheck, UserPlus, X, AlertCircle } from 'lucide-react';
import { GRADES } from '@/lib/config';
import type { Student } from '@/types';

interface StudentFormProps {
  initialData?: Student | null;
  onSubmit: (student: { name: string; grade: string }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function StudentForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: StudentFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [grade, setGrade] = useState(initialData?.grade ?? (GRADES[0] || '7'));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Student name is required');
      return;
    }
    setError(null);
    try {
      await onSubmit({ name: name.trim(), grade });
      if (!initialData) {
        setName('');
        setGrade(GRADES[0] || '7');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save student profile');
    }
  };

  const isEditing = Boolean(initialData);

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl border transition-all p-5 sm:p-6 ${
        isEditing
          ? 'bg-[var(--surface-2)] border-[var(--gold)]/60 shadow-lg shadow-[var(--gold-glow)]'
          : 'bg-[var(--surface)] border-[var(--border)]'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isEditing
                ? 'bg-[var(--gold-dim)] text-[var(--gold)]'
                : 'bg-[var(--surface-2)] text-[var(--text-2)]'
            }`}
          >
            {isEditing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-1)]">
              {isEditing ? 'Edit Student Profile' : 'Register New Student'}
            </h3>
            {isEditing && (
              <p className="text-xs text-[var(--gold)] font-medium">
                Editing: {initialData?.name} (Grade {initialData?.grade})
              </p>
            )}
          </div>
        </div>

        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-[var(--text-2)] hover:text-[var(--text-1)] flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--surface-3)] hover:bg-[var(--border-2)] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Cancel Edit
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 text-xs text-red-300 border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label
            htmlFor="student-name"
            className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-3)] mb-1.5"
          >
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            id="student-name"
            type="text"
            required
            placeholder="e.g. Isaac Newton"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-1)] placeholder-[var(--text-3)] rounded-lg text-sm focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="student-grade"
            className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-3)] mb-1.5"
          >
            Grade Level <span className="text-red-400">*</span>
          </label>
          <select
            id="student-grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-1)] rounded-lg text-sm focus:outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)] transition-colors cursor-pointer"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2.5 bg-[var(--gold)] hover:bg-[#e0a520] active:scale-[0.98] text-black text-xs font-bold rounded-lg tracking-wide shadow transition-all disabled:opacity-40 cursor-pointer"
        >
          {isLoading ? 'Saving...' : isEditing ? 'Update Student' : 'Add Student'}
        </button>
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 bg-transparent border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
