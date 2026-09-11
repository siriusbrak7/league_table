'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { StudentForm } from '@/components/students/student-form';
import { StudentList } from '@/components/students/student-list';
import type { Student } from '@/types';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isCancelled = false;

    async function loadStudents() {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('students')
          .select('*')
          .order('grade')
          .order('name');

        if (gradeFilter !== 'All') {
          query = query.eq('grade', gradeFilter);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;
        if (!isCancelled) {
          setStudents(data || []);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load students');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadStudents();

    return () => {
      isCancelled = true;
    };
  }, [supabase, gradeFilter, refreshTrigger]);

  const handleCreateOrUpdate = async (formData: {
    name: string;
    grade: string;
  }) => {
    setIsSubmitting(true);
    try {
      if (editingStudent) {
        // Update existing student
        const { error: updateError } = await supabase
          .from('students')
          .update({
            name: formData.name,
            grade: formData.grade,
          })
          .eq('id', editingStudent.id);

        if (updateError) throw updateError;
        setEditingStudent(null);
      } else {
        // Insert new student
        const { error: insertError } = await supabase
          .from('students')
          .insert([
            {
              name: formData.name,
              grade: formData.grade,
            },
          ]);

        if (insertError) throw insertError;
      }

      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save student');
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
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      if (editingStudent?.id === id) {
        setEditingStudent(null);
      }
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete student');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-2">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Students</h1>
            <p className="text-gray-600 mt-1">
              Add, edit, or remove students across Grades 7–11
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="filter-grade" className="text-sm font-medium text-gray-700">
              Filter by Grade:
            </label>
            <select
              id="filter-grade"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm cursor-pointer"
            >
              <option value="All">All Grades</option>
              <option value="7">Grade 7</option>
              <option value="8">Grade 8</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
            </select>
          </div>
        </div>

        {/* Add/Edit Student Form */}
        <StudentForm
          key={editingStudent ? editingStudent.id : 'new'}
          initialData={editingStudent}
          onSubmit={handleCreateOrUpdate}
          onCancel={() => setEditingStudent(null)}
          isLoading={isSubmitting}
        />

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            Error: {error}
          </div>
        )}

        {/* Student List Table */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Loading students...
          </div>
        ) : (
          <StudentList
            students={students}
            onEdit={(student) => setEditingStudent(student)}
            onDelete={handleDelete}
            isLoading={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
