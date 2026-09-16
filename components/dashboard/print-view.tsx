'use client';

import { useState } from 'react';
import { getPercentageColors } from '@/lib/utils/colors';
import { GRADES } from '@/lib/config';
import type { GradeProcessedData } from '@/lib/utils/processGradeData';

interface PrintViewProps {
  gradeSections: GradeProcessedData[];
}

export default function PrintView({ gradeSections }: PrintViewProps) {
  const [showBehavior, setShowBehavior] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>('All Grades');

  const handlePrint = () => {
    window.print();
  };

  const filteredSections =
    selectedGrade === 'All Grades'
      ? gradeSections
      : gradeSections.filter((section) => `Grade ${section.grade}` === selectedGrade);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header - Hidden on Print */}
      <div className="print:hidden p-6 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Physics League Table</h1>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition cursor-pointer"
          >
            Print / Save as PDF
          </button>

          <div className="flex items-center gap-2">
            <label htmlFor="print-grade-select" className="text-sm font-semibold text-gray-800">
              Grade:
            </label>
            <select
              id="print-grade-select"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-2 text-sm text-gray-900 font-medium bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All Grades">All Grades</option>
              {GRADES.map((g) => (
                <option key={g} value={`Grade ${g}`}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={showBehavior}
              onChange={(e) => setShowBehavior(e.target.checked)}
              className="rounded cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-800">Show Behavior Ranking</span>
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-12 print:p-0 print:space-y-8">
        {filteredSections.length === 0 ? (
          <div className="text-center text-gray-700 py-8 font-medium">
            No students found for the selected grade filter.
          </div>
        ) : (
          filteredSections.map((section) => {
            return (
              <div key={section.grade} className="break-inside-avoid print:break-after-page mb-8">
                <div className="border-b-2 border-gray-900 pb-2 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                    Grade {section.grade} League Table
                  </h2>
                </div>

                <div className={`grid grid-cols-1 ${showBehavior ? 'lg:grid-cols-2' : ''} gap-8`}>
                  {/* Academic Table */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Academic Performance</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-400 text-gray-900">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-400 px-4 py-2 text-left font-bold text-gray-900">
                              Rank
                            </th>
                            <th className="border border-gray-400 px-4 py-2 text-left font-bold text-gray-900">
                              Student
                            </th>
                            <th className="border border-gray-400 px-4 py-2 text-right font-bold text-gray-900">
                              Weighted %
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.rankedAcademic.map((item) => {
                            const { background, text } = getPercentageColors(
                              item.weightedPercentage,
                              item.hasData
                            );

                            return (
                              <tr key={item.student.id} className="hover:bg-gray-50">
                                <td className="border border-gray-400 px-4 py-2 font-bold text-gray-900">
                                  {item.hasData && item.rank !== null ? item.rank : '—'}
                                </td>
                                <td className="border border-gray-400 px-4 py-2 font-semibold text-gray-900">
                                  {item.student.name}
                                </td>
                                <td
                                  className="border border-gray-400 px-4 py-2 text-right font-bold"
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
                  {showBehavior && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3">Behavior Performance</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-400 text-gray-900">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-400 px-4 py-2 text-left font-bold text-gray-900">
                                Rank
                              </th>
                              <th className="border border-gray-400 px-4 py-2 text-left font-bold text-gray-900">
                                Student
                              </th>
                              <th className="border border-gray-400 px-4 py-2 text-right font-bold text-gray-900">
                                Behavior Average
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {section.rankedBehavior.map((item) => {
                              const { background, text } = getPercentageColors(
                                item.average,
                                item.hasData
                              );

                              return (
                                <tr key={item.student.id} className="hover:bg-gray-50">
                                  <td className="border border-gray-400 px-4 py-2 font-bold text-gray-900">
                                    {item.hasData && item.rank !== null ? item.rank : '—'}
                                  </td>
                                  <td className="border border-gray-400 px-4 py-2 font-semibold text-gray-900">
                                    {item.student.name}
                                  </td>
                                  <td
                                    className="border border-gray-400 px-4 py-2 text-right font-bold"
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
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: #ffffff !important;
            color: #111827 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          table {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
