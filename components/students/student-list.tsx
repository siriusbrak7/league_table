'use client';

import { Edit2, Trash2, GraduationCap } from 'lucide-react';
import type { Student } from '@/types';

interface StudentListProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (id: string, name: string) => void;
  isLoading?: boolean;
}

export function StudentList({ students, onEdit, onDelete, isLoading = false }: StudentListProps) {
  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
        <GraduationCap className="w-8 h-8 text-[var(--text-3)] mx-auto mb-3" />
        <p className="text-sm font-semibold text-[var(--text-1)]">No students found</p>
        <p className="text-xs text-[var(--text-3)] mt-1">
          Try adjusting your grade filter or search query.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/60">
              <th className="px-5 py-3 text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-5 py-3 text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider w-36">
                Grade
              </th>
              <th className="px-5 py-3 text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider text-right w-44">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {students.map((student) => (
              <tr
                key={student.id}
                className="hover:bg-[var(--surface-2)]/50 transition-colors group"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--text-2)] group-hover:border-[var(--gold)]/50 group-hover:text-[var(--gold)] transition-colors">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-[var(--text-1)]">
                      {student.name}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--surface-2)] text-[var(--gold)] border border-[var(--border)]">
                    Grade {student.grade}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => onEdit(student)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[var(--text-2)] hover:text-[var(--gold)] hover:bg-[var(--surface-2)] rounded-md border border-transparent hover:border-[var(--border)] transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(student.id, student.name)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[var(--text-2)] hover:text-red-400 hover:bg-red-500/10 rounded-md border border-transparent hover:border-red-500/30 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
