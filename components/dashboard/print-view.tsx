'use client';

import { useState } from 'react';
import { getPercentageColors } from '@/lib/utils/colors';
import type { GradeProcessedData } from '@/lib/utils/processGradeData';

interface PrintViewProps {
  gradeSections: GradeProcessedData[];
}

export default function PrintView({ gradeSections }: PrintViewProps) {
  const [showBehavior, setShowBehavior] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Hidden on Print */}
      <div className="print:hidden p-6 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Physics League Table</h1>
        <div className="flex gap-4">
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer"
          >
            Print / Save as PDF
          </button>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showBehavior}
              onChange={(e) => setShowBehavior(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-700">Show Behavior Ranking</span>
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-12">
        {gradeSections.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No students found.
          </div>
        ) : (
          gradeSections.map((section) => {
            // Sort students by academic rank (1, 2, 3...)
            const academicSortedStudents = [...section.students].sort((a, b) => {
              const rankA = section.academicRanks[a.id] ?? Number.MAX_SAFE_INTEGER;
              const rankB = section.academicRanks[b.id] ?? Number.MAX_SAFE_INTEGER;
              return rankA - rankB;
            });

            // Sort students by behavior rank (1, 2, 3...)
            const behaviorSortedStudents = [...section.students].sort((a, b) => {
              const rankA = section.behaviorRanks[a.id] ?? Number.MAX_SAFE_INTEGER;
              const rankB = section.behaviorRanks[b.id] ?? Number.MAX_SAFE_INTEGER;
              return rankA - rankB;
            });

            return (
              <div key={section.grade} className="break-inside-avoid print:break-after-page mb-8">
                <div className="border-b-2 border-gray-800 pb-2 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                    Grade {section.grade} League Table
                  </h2>
                </div>

                <div className={`grid grid-cols-1 ${showBehavior ? 'lg:grid-cols-2' : ''} gap-8`}>
                  {/* Academic Table */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Academic Performance</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                              Rank
                            </th>
                            <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                              Student
                            </th>
                            <th className="border border-gray-300 px-4 py-2 text-right font-semibold">
                              Weighted %
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {academicSortedStudents.map((student) => {
                            const rank = section.academicRanks[student.id];
                            const pct = section.overallPercentages.find(
                              (p) => p.studentId === student.id
                            );
                            const percentage = pct?.academic ?? 0;
                            const hasData = pct?.hasAcademicData ?? false;
                            const { background, text } = getPercentageColors(percentage, hasData);

                            return (
                              <tr key={student.id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">
                                  {rank}
                                </td>
                                <td className="border border-gray-300 px-4 py-2 font-medium">
                                  {student.name}
                                </td>
                                <td
                                  className="border border-gray-300 px-4 py-2 text-right font-semibold"
                                  style={{ backgroundColor: background, color: text }}
                                >
                                  {hasData ? `${percentage.toFixed(1)}%` : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Behavior Table */}
                  {showBehavior && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">Behavior Performance</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                                Rank
                              </th>
                              <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                                Student
                              </th>
                              <th className="border border-gray-300 px-4 py-2 text-right font-semibold">
                                Behavior Average
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {behaviorSortedStudents.map((student) => {
                              const rank = section.behaviorRanks[student.id];
                              const pct = section.overallPercentages.find(
                                (p) => p.studentId === student.id
                              );
                              const score = pct?.behavior ?? 0;
                              const hasData = pct?.hasBehaviorData ?? false;
                              const { background, text } = getPercentageColors(score, hasData);

                              return (
                                <tr key={student.id} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-4 py-2 font-semibold text-gray-700">
                                    {rank}
                                  </td>
                                  <td className="border border-gray-300 px-4 py-2 font-medium">
                                    {student.name}
                                  </td>
                                  <td
                                    className="border border-gray-300 px-4 py-2 text-right font-semibold"
                                    style={{ backgroundColor: background, color: text }}
                                  >
                                    {hasData ? `${score.toFixed(1)}%` : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print\\:hidden {
            display: none;
          }
          table {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
