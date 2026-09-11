'use client';

import { useState } from 'react';
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
  const [grade, setGrade] = useState(initialData?.grade ?? '7');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a student name');
      return;
    }
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        grade,
      });
      if (!initialData) {
        setName('');
        setGrade('7');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save student');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {initialData ? 'Edit Student' : 'Add New Student'}
      </h3>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="student-name" className="block text-sm font-semibold text-gray-800 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="student-name"
            type="text"
            required
            placeholder="e.g. John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full px-4 py-3 border-2 border-gray-400 rounded-md shadow-sm text-gray-900 text-base font-medium placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="student-grade" className="block text-sm font-semibold text-gray-800 mb-1">
            Grade Level <span className="text-red-500">*</span>
          </label>
          <select
            id="student-grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="mt-1 block w-full px-4 py-3 border-2 border-gray-400 rounded-md shadow-sm text-gray-900 text-base font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            <option value="7" className="text-gray-900 bg-white">Grade 7</option>
            <option value="8" className="text-gray-900 bg-white">Grade 8</option>
            <option value="9" className="text-gray-900 bg-white">Grade 9</option>
            <option value="10" className="text-gray-900 bg-white">Grade 10</option>
            <option value="11" className="text-gray-900 bg-white">Grade 11</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? 'Saving...' : initialData ? 'Update Student' : 'Add Student'}
        </button>

        {initialData && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="py-3 px-6 border-2 border-gray-400 rounded-md shadow-sm text-base font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
