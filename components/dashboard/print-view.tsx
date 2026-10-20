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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)] print:bg-white print:text-black py-4 print:py-0">
      {/* Header - Hidden on Print */}
      <div className="print:hidden border border-[var(--border)] bg-[var(--surface)] rounded-xl p-6 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="font-mono text-xs text-[var(--gold)] uppercase tracking-wider mb-2 font-bold">
              Export & Printing Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-1)] tracking-tight">
              Printable League Dossiers
            </h1>
            <p className="text-[var(--text-2)] text-xs sm:text-sm mt-1">
              Generate formatted PDF reports or physical printouts for classroom bulletin boards.
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="btn-primary py-2.5 px-5 text-xs font-mono uppercase tracking-wider rounded-lg shadow-sm flex items-center justify-center gap-2 shrink-0"
          >
            <span>Print / Save as PDF</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-5 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <label htmlFor="print-grade-select" className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-2)] font-semibold">
              Grade Cohort:
            </label>
            <select
              id="print-grade-select"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="form-input text-xs font-mono py-1.5 px-3 w-auto cursor-pointer"
            >
              <option value="All Grades" className="bg-[var(--surface)] text-[var(--text-1)]">All Grades</option>
              {GRADES.map((g) => (
                <option key={g} value={`Grade ${g}`} className="bg-[var(--surface)] text-[var(--text-1)]">
                  Grade {g}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-[var(--text-2)] font-medium">
            <input
              type="checkbox"
              checked={showBehavior}
              onChange={(e) => setShowBehavior(e.target.checked)}
              className="w-4 h-4 rounded-sm accent-[var(--gold)] cursor-pointer"
            />
            <span>Include Conduct & Behavior Tables</span>
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8 print:space-y-8">
        {filteredSections.length === 0 ? (
          <div className="border border-[var(--border)] bg-[var(--surface)] rounded-xl p-12 text-center font-mono text-sm text-[var(--text-3)] print:text-black print:border-black print:bg-white">
            No students found for the selected grade filter.
          </div>
        ) : (
          filteredSections.map((section) => {
            return (
              <div
                key={section.grade}
                className="border border-[var(--border)] bg-[var(--surface)] rounded-xl p-6 break-inside-avoid print:break-after-page mb-8 print:p-0 print:border-none print:shadow-none print:bg-white print:mb-0"
              >
                <div className="border-b border-[var(--border)] pb-3 mb-6 print:border-b-2 print:border-black">
                  <h2 className="text-xl font-black text-[var(--text-1)] tracking-wide uppercase print:text-black">
                    Grade {section.grade} League Table
                  </h2>
                </div>

                <div className={`grid grid-cols-1 ${showBehavior ? 'lg:grid-cols-2' : ''} gap-6`}>
                  {/* Academic Table */}
                  <div>
                    <h3 className="font-mono text-xs font-bold text-[var(--text-2)] uppercase tracking-wider mb-3 flex items-center gap-2 print:text-black print:text-base">
                      Academic Mastery
                    </h3>
                    <div className="overflow-x-auto border border-[var(--border)] bg-[var(--surface)] rounded-lg print:border print:border-black print:rounded-none">
                      <table className="w-full border-collapse text-sm print:text-black">
                        <thead>
                          <tr className="bg-[var(--surface-2)] border-b border-[var(--border)] font-mono text-[11px] font-bold text-[var(--text-1)] uppercase tracking-wider print:bg-gray-100 print:text-black print:border-b print:border-black">
                            <th className="px-4 py-2.5 text-left w-20 print:border print:border-black">Rank</th>
                            <th className="px-4 py-2.5 text-left print:border print:border-black">Student</th>
                            <th className="px-4 py-2.5 text-right w-32 print:border print:border-black">Mastery %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)] print:divide-black">
                          {section.rankedAcademic.map((item) => {
                            const { background, text } = getPercentageColors(
                              item.weightedPercentage,
                              item.hasData
                            );

                            return (
                              <tr key={item.student.id} className="hover:bg-[var(--surface-2)] transition-colors print:hover:bg-transparent">
                                <td className="px-4 py-2 font-mono text-xs font-bold text-[var(--text-2)] print:text-black print:border print:border-black">
                                  {item.hasData && item.rank !== null ? `#${item.rank}` : '—'}
                                </td>
                                <td className="px-4 py-2 text-sm font-medium text-[var(--text-1)] print:text-black print:border print:border-black">
                                  {item.student.name}
                                </td>
                                <td className="px-4 py-2 text-right print:border print:border-black">
                                  <span
                                    className="px-2 py-0.5 rounded-md font-mono text-xs font-bold inline-block print:border print:border-black"
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
                      <h3 className="font-mono text-xs font-bold text-[var(--text-2)] uppercase tracking-wider mb-3 flex items-center gap-2 print:text-black print:text-base">
                        Behavior Performance
                      </h3>
                      <div className="overflow-x-auto border border-[var(--border)] bg-[var(--surface)] rounded-lg print:border print:border-black print:rounded-none">
                        <table className="w-full border-collapse text-sm print:text-black">
                          <thead>
                            <tr className="bg-[var(--surface-2)] border-b border-[var(--border)] font-mono text-[11px] font-bold text-[var(--text-1)] uppercase tracking-wider print:bg-gray-100 print:text-black print:border-b print:border-black">
                              <th className="px-4 py-2.5 text-left w-20 print:border print:border-black">Rank</th>
                              <th className="px-4 py-2.5 text-left print:border print:border-black">Student</th>
                              <th className="px-4 py-2.5 text-right w-32 print:border print:border-black">Conduct %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)] print:divide-black">
                            {section.rankedBehavior.map((item) => {
                              const { background, text } = getPercentageColors(
                                item.average,
                                item.hasData
                              );

                              return (
                                <tr key={item.student.id} className="hover:bg-[var(--surface-2)] transition-colors print:hover:bg-transparent">
                                  <td className="px-4 py-2 font-mono text-xs font-bold text-[var(--text-2)] print:text-black print:border print:border-black">
                                    {item.hasData && item.rank !== null ? `#${item.rank}` : '—'}
                                  </td>
                                  <td className="px-4 py-2 text-sm font-medium text-[var(--text-1)] print:text-black print:border print:border-black">
                                    {item.student.name}
                                  </td>
                                  <td className="px-4 py-2 text-right print:border print:border-black">
                                    <span
                                      className="px-2 py-0.5 rounded-md font-mono text-xs font-bold inline-block print:border print:border-black"
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
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .nav-root, nav, header, button, .print\\:hidden {
            display: none !important;
          }
          table {
            page-break-inside: avoid;
            border-collapse: collapse !important;
          }
        }
      `}</style>
    </div>
  );
}

