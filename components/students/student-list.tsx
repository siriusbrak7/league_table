'use client';

import type { Student } from '@/types';

interface StudentListProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (id: string, name: string) => void;
  isLoading?: boolean;
}

export function StudentList({
  students,
  onEdit,
  onDelete,
  isLoading = false,
}: StudentListProps) {
  if (students.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        No students found for the selected filter.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-800 uppercase tracking-wider">
                Grade
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-bold text-gray-800 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-blue-50/60 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-950">
                  {student.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Grade {student.grade}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                  <button
                    onClick={() => onEdit(student)}
                    disabled={isLoading}
                    className="text-blue-600 hover:text-blue-800 mr-4 cursor-pointer disabled:opacity-50 font-semibold hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(student.id, student.name)}
                    disabled={isLoading}
                    className="text-red-600 hover:text-red-800 cursor-pointer disabled:opacity-50 font-semibold hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
