'use client';

import { useState } from 'react';
import { getPercentageColors } from '@/lib/utils/colors';
import type { GradeProcessedData } from '@/lib/utils/processGradeData';
import type { Student } from '@/types';
import StudentDetailModal from './student-detail-modal';

interface DashboardTablesProps {
  gradeSections: GradeProcessedData[];
}

export default function DashboardTables({ gradeSections }: DashboardTablesProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  if (gradeSections.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        No students found. Add students to view league tables.
      </div>
    );
  }

  return (
    <>
      {gradeSections.map((section) => (
        <div key={section.grade} className="bg-white rounded-lg shadow overflow-hidden mb-10">
          {/* Grade Section Heading */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">
              Grade {section.grade} League Table
            </h3>
          </div>

          {/* Side-by-side Academic and Behavior Tables */}
          <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Academic Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                <h4 className="text-base font-semibold text-gray-900">
                  Academic Performance
                </h4>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Weighted %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {section.rankedAcademic.map((item) => {
                      const { background, text } = getPercentageColors(item.weightedPercentage, item.hasData);
                      return (
                        <tr
                          key={item.student.id}
                          onClick={() => setSelectedStudent(item.student)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-700">
                            {item.hasData && item.rank !== null ? item.rank : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.student.name}
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap text-sm font-bold text-right"
                            style={{ backgroundColor: background, color: text }}
                          >
                            {item.hasData ? `${item.weightedPercentage.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Behavior Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                <h4 className="text-base font-semibold text-gray-900">
                  Behavior Performance
                </h4>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Behavior Average
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {section.rankedBehavior.map((item) => {
                      const { background, text } = getPercentageColors(item.average, item.hasData);
                      return (
                        <tr
                          key={item.student.id}
                          onClick={() => setSelectedStudent(item.student)}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-700">
                            {item.hasData && item.rank !== null ? item.rank : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.student.name}
                          </td>
                          <td
                            className="px-4 py-3 whitespace-nowrap text-sm font-bold text-right"
                            style={{ backgroundColor: background, color: text }}
                          >
                            {item.hasData ? `${item.average.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </>
  );
}
