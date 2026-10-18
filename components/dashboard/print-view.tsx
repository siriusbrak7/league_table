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
    <div className="min-h-screen bg-[#0c0c0e] text-[#f0f0f2] print:bg-white print:text-black">
      {/* Header - Hidden on Print */}
      <div className="print:hidden border border-[#1f1f27] bg-[#111115] rounded p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="font-mono text-xs text-[#8b8b9a] uppercase tracking-wider mb-2">
              Export & Printing Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#f0f0f2] tracking-tight">
              Printable League Dossiers
            </h1>
            <p className="text-[#8b8b9a] text-xs sm:text-sm mt-1">
              Generate formatted PDF reports or physical printouts for classroom bulletin boards.
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs font-mono uppercase tracking-wider rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            <span>Print / Save as PDF</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-5 pt-4 border-t border-[#1f1f27]">
          <div className="flex items-center gap-2">
            <label htmlFor="print-grade-select" className="font-mono text-[11px] uppercase tracking-wider text-[#8b8b9a]">
              Grade Cohort:
            </label>
            <select
              id="print-grade-select"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-1.5 font-mono text-xs text-[#f0f0f2] bg-[#0c0c0e] border border-[#2a2a35] rounded-sm focus:outline-none focus:border-amber-500/60 cursor-pointer"
            >
              <option value="All Grades" className="bg-[#0c0c0e] text-[#f0f0f2]">All Grades</option>
              {GRADES.map((g) => (
                <option key={g} value={`Grade ${g}`} className="bg-[#0c0c0e] text-[#f0f0f2]">
                  Grade {g}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-[#8b8b9a]">
            <input
              type="checkbox"
              checked={showBehavior}
              onChange={(e) => setShowBehavior(e.target.checked)}
              className="w-4 h-4 rounded-sm accent-amber-500 cursor-pointer"
            />
            <span>Include Conduct & Behavior Tables</span>
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8 print:space-y-8">
        {filteredSections.length === 0 ? (
          <div className="border border-[#1f1f27] bg-[#111115] rounded p-12 text-center font-mono text-sm text-[#55555f] print:text-black">
            No students found for the selected grade filter.
          </div>
        ) : (
          filteredSections.map((section) => {
            return (
              <div
                key={section.grade}
                className="border border-[#1f1f27] bg-[#111115] rounded p-6 break-inside-avoid print:break-after-page mb-8 print:p-0 print:border-none print:shadow-none print:bg-white"
              >
                <div className="border-b border-[#1f1f27] pb-3 mb-6 print:border-b-2 print:border-black">
                  <h2 className="text-xl font-black text-[#f0f0f2] tracking-wide uppercase print:text-black">
                    Grade {section.grade} League Table
                  </h2>
                </div>

                <div className={`grid grid-cols-1 ${showBehavior ? 'lg:grid-cols-2' : ''} gap-6`}>
                  {/* Academic Table */}
                  <div>
                    <h3 className="font-mono text-xs font-semibold text-[#8b8b9a] uppercase tracking-wider mb-3 flex items-center gap-2 print:text-black print:text-base">
                      Academic Mastery
                    </h3>
                    <div className="overflow-x-auto border border-[#1f1f27] bg-[#0c0c0e] rounded-sm print:border-gray-400 print:rounded-none">
                      <table className="w-full border-collapse text-sm print:text-black">
                        <thead>
                          <tr className="bg-[#0c0c0e] border-b border-[#1f1f27] font-mono text-[11px] font-semibold text-[#8b8b9a] uppercase tracking-wider print:bg-gray-100 print:text-black print:border-gray-400">
                            <th className="px-4 py-2.5 text-left w-20">Rank</th>
                            <th className="px-4 py-2.5 text-left">Student</th>
                            <th className="px-4 py-2.5 text-right w-32">Mastery %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f1f27] print:divide-gray-300">
                          {section.rankedAcademic.map((item) => {
                            const { background, text } = getPercentageColors(
                              item.weightedPercentage,
                              item.hasData
                            );

                            return (
                              <tr key={item.student.id} className="hover:bg-[#18181e] transition-colors print:hover:bg-transparent">
                                <td className="px-4 py-2 font-mono text-xs font-semibold text-[#8b8b9a] print:text-black">
                                  {item.hasData && item.rank !== null ? `#${item.rank}` : '—'}
                                </td>
                                <td className="px-4 py-2 text-sm font-medium text-[#f0f0f2] print:text-black">
                                  {item.student.name}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <span
                                    className="px-2 py-0.5 rounded-sm font-mono text-xs font-bold inline-block print:border print:border-gray-300"
                                    style={{ backgroundColor: background, color: text }}
                                  >
                                    {item.hasData ? `${item.weightedPercentage.toFixed(1)}%` : '—'}
                                  </span>
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
                      <h3 className="font-mono text-xs font-semibold text-[#8b8b9a] uppercase tracking-wider mb-3 flex items-center gap-2 print:text-black print:text-base">
                        Behavior Performance
                      </h3>
                      <div className="overflow-x-auto border border-[#1f1f27] bg-[#0c0c0e] rounded-sm print:border-gray-400 print:rounded-none">
                        <table className="w-full border-collapse text-sm print:text-black">
                          <thead>
                            <tr className="bg-[#0c0c0e] border-b border-[#1f1f27] font-mono text-[11px] font-semibold text-[#8b8b9a] uppercase tracking-wider print:bg-gray-100 print:text-black print:border-gray-400">
                              <th className="px-4 py-2.5 text-left w-20">Rank</th>
                              <th className="px-4 py-2.5 text-left">Student</th>
                              <th className="px-4 py-2.5 text-right w-32">Conduct %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1f1f27] print:divide-gray-300">
                            {section.rankedBehavior.map((item) => {
                              const { background, text } = getPercentageColors(
                                item.average,
                                item.hasData
                              );

                              return (
                                <tr key={item.student.id} className="hover:bg-[#18181e] transition-colors print:hover:bg-transparent">
                                  <td className="px-4 py-2 font-mono text-xs font-semibold text-[#8b8b9a] print:text-black">
                                    {item.hasData && item.rank !== null ? `#${item.rank}` : '—'}
                                  </td>
                                  <td className="px-4 py-2 text-sm font-medium text-[#f0f0f2] print:text-black">
                                    {item.student.name}
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    <span
                                      className="px-2 py-0.5 rounded-sm font-mono text-xs font-bold inline-block print:border print:border-gray-300"
                                      style={{ backgroundColor: background, color: text }}
                                    >
                                      {item.hasData ? `${item.average.toFixed(1)}%` : '—'}
                                    </span>
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
            color: #000000 !important;
          }
          .cosmic-bg {
            background: #ffffff !important;
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

