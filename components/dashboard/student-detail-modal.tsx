'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CURRENT_TERM, CURRENT_YEAR } from '@/lib/config';
import { calculateWeeklyPercentage } from '@/lib/utils/calculations';
import { getPercentageColors } from '@/lib/utils/colors';
import { processGradeData } from '@/lib/utils/processGradeData';
import type { Student, AcademicScore, BehaviorScore, WeekConfig } from '@/types';

interface StudentDetailModalProps {
  student: Student;
  onClose: () => void;
}

interface WeekRowData {
  week: number;
  test?: { score: number; total: number };
  classwork?: { score: number; total: number };
  homework?: { score: number; total: number };
  behavior?: number;
  weeklyPercentage: number | null;
}

export default function StudentDetailModal({ student, onClose }: StudentDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeklyRows, setWeeklyRows] = useState<WeekRowData[]>([]);
  const [overallAcademicPct, setOverallAcademicPct] = useState<number>(0);
  const [hasAcademicData, setHasAcademicData] = useState<boolean>(false);
  const [academicRank, setAcademicRank] = useState<number | null>(null);
  const [behaviorAvg, setBehaviorAvg] = useState<number>(0);
  const [hasBehaviorData, setHasBehaviorData] = useState<boolean>(false);
  const [behaviorRank, setBehaviorRank] = useState<number | null>(null);

  // Prevent background scrolling while modal is open & listen for Escape key
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Fetch score history for the student and grade ranking info
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      try {
        // Fetch all students in the same grade to calculate grade ranks correctly
        const { data: gradeStudents, error: studentsErr } = await supabase
          .from('students')
          .select('*')
          .eq('grade', student.grade);

        if (studentsErr) throw studentsErr;

        const gradeStudentIds = (gradeStudents ?? []).map((s) => s.id);

        let academicScores: AcademicScore[] = [];
        let behaviorScores: BehaviorScore[] = [];

        if (gradeStudentIds.length > 0) {
          const [academicRes, behaviorRes] = await Promise.all([
            supabase
              .from('academic_scores')
              .select('*')
              .eq('term', CURRENT_TERM)
              .eq('year', CURRENT_YEAR)
              .in('student_id', gradeStudentIds),
            supabase
              .from('behavior_scores')
              .select('*')
              .eq('term', CURRENT_TERM)
              .eq('year', CURRENT_YEAR)
              .in('student_id', gradeStudentIds),
          ]);

          if (academicRes.error) throw academicRes.error;
          if (behaviorRes.error) throw behaviorRes.error;

          academicScores = (academicRes.data as AcademicScore[]) ?? [];
          behaviorScores = (behaviorRes.data as BehaviorScore[]) ?? [];
        }

        const { data: weekConfigs, error: weekConfigErr } = await supabase
          .from('week_config')
          .select('*')
          .eq('term', CURRENT_TERM)
          .eq('year', CURRENT_YEAR)
          .eq('grade', student.grade);

        if (weekConfigErr) throw weekConfigErr;

        // Process data for student's grade
        const gradeData = processGradeData(
          student.grade,
          gradeStudents ?? [],
          (academicScores as AcademicScore[]) ?? [],
          (behaviorScores as BehaviorScore[]) ?? [],
          (weekConfigs as WeekConfig[]) ?? []
        );

        // Find this student's computed overall data
        const studentAcData = gradeData.rankedAcademic.find((item) => item.student.id === student.id);
        const studentBhData = gradeData.rankedBehavior.find((item) => item.student.id === student.id);
        const overallFlags = gradeData.overallPercentages.find((item) => item.studentId === student.id);

        setAcademicRank(studentAcData?.rank ?? null);
        setOverallAcademicPct(studentAcData?.weightedPercentage ?? 0);
        setHasAcademicData(overallFlags?.hasAcademicData ?? false);

        setBehaviorRank(studentBhData?.rank ?? null);
        setBehaviorAvg(studentBhData?.average ?? 0);
        setHasBehaviorData(overallFlags?.hasBehaviorData ?? false);

        // Build 1–12 weekly table rows
        const rows: WeekRowData[] = [];
        const studentAcScores = (academicScores as AcademicScore[])?.filter(
          (s) => s.student_id === student.id
        );
        const studentBhScores = (behaviorScores as BehaviorScore[])?.filter(
          (s) => s.student_id === student.id
        );

        for (let week = 1; week <= 12; week++) {
          const weekAcScores = studentAcScores?.filter((s) => s.week === week) ?? [];
          const testScore = weekAcScores.find((s) => s.category === 'test');
          const classworkScore = weekAcScores.find((s) => s.category === 'classwork');
          const homeworkScore = weekAcScores.find((s) => s.category === 'homework');

          const bhScore = studentBhScores?.find((s) => s.week === week);

          const test = testScore ? { score: testScore.score, total: testScore.total } : undefined;
          const classwork = classworkScore
            ? { score: classworkScore.score, total: classworkScore.total }
            : undefined;
          const homework = homeworkScore
            ? { score: homeworkScore.score, total: homeworkScore.total }
            : undefined;
          const configuredRows = ((weekConfigs as WeekConfig[]) ?? []).filter(
            (config) => config.week === week
          );
          const configuredCategories = {
            test: configuredRows.some((config) => config.category === 'test'),
            classwork: configuredRows.some((config) => config.category === 'classwork'),
            homework: configuredRows.some((config) => config.category === 'homework'),
          };

          const weeklyPercentage = calculateWeeklyPercentage(
            configuredCategories,
            test,
            classwork,
            homework
          );

          rows.push({
            week,
            test,
            classwork,
            homework,
            behavior: bhScore ? bhScore.score : undefined,
            weeklyPercentage,
          });
        }

        setWeeklyRows(rows);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An error occurred while fetching data';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [student]);

  const handlePrint = () => {
    window.print();
  };

  const overallAcColors = getPercentageColors(overallAcademicPct, hasAcademicData);
  const behaviorAvgColors = getPercentageColors(behaviorAvg, hasBehaviorData);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:p-0 print:bg-transparent print:static print:inset-auto print:block"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl print:bg-white print:text-black print:max-w-none print:w-full print:max-h-none print:shadow-none print:rounded-none print:border-none">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-2)]/60 print:bg-white print:border-b-2 print:border-gray-800">
          <div>
            <p className="eyebrow text-[var(--gold)]">
              Grade {student.grade} · {CURRENT_TERM} {CURRENT_YEAR}
            </p>
            <h2 className="text-lg font-extrabold text-[var(--text-1)] print:text-black">{student.name}</h2>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-2)] hover:text-[var(--text-1)] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Print Report
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--text-3)] hover:text-[var(--text-1)] rounded-lg hover:bg-[var(--surface)] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 print:overflow-visible">
          {loading ? (
            <div className="py-16 text-center text-[var(--text-2)] font-medium">
              <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--gold)] animate-spin mx-auto mb-3" />
              Loading student history...
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">{error}</div>
          ) : (
            <>
              {/* Top Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3.5 print:bg-white print:border-gray-300">
                  <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-2)]">Academic Total</div>
                  <div className="mt-2">
                    <span
                      className="font-mono text-base font-black px-2.5 py-1 rounded-md inline-block"
                      style={{ backgroundColor: overallAcColors.background, color: overallAcColors.text }}
                    >
                      {hasAcademicData ? `${overallAcademicPct.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </div>
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3.5 print:bg-white print:border-gray-300">
                  <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-2)]">Academic Rank</div>
                  <div className="text-2xl font-black font-mono text-[var(--gold)] mt-1.5 print:text-black">
                    {hasAcademicData && academicRank !== null ? `#${academicRank}` : '—'}
                  </div>
                </div>
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3.5 print:bg-white print:border-gray-300">
                  <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-2)]">Conduct Total</div>
                  <div className="mt-2">
                    <span
                      className="font-mono text-base font-black px-2.5 py-1 rounded-md inline-block"
                      style={{ backgroundColor: behaviorAvgColors.background, color: behaviorAvgColors.text }}
                    >
                      {hasBehaviorData ? `${behaviorAvg.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                </div>
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3.5 print:bg-white print:border-gray-300">
                  <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-2)]">Conduct Rank</div>
                  <div className="text-2xl font-black font-mono text-[var(--text-2)] mt-1.5 print:text-black">
                    {hasBehaviorData && behaviorRank !== null ? `#${behaviorRank}` : '—'}
                  </div>
                </div>
              </div>

              {/* Weekly Scores Table */}
              <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-2)]/40 print:border-gray-400">
                <table className="min-w-full divide-y divide-[var(--border-2)] text-sm print:divide-gray-300">
                  <thead className="bg-[var(--surface-2)] print:bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[var(--text-1)] print:text-black">Week</th>
                      <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--text-1)] print:text-black">Test (50%)</th>
                      <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--text-1)] print:text-black">Classwork (30%)</th>
                      <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--text-1)] print:text-black">Homework (20%)</th>
                      <th className="border-l-2 border-[var(--border-2)] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--text-1)] print:border-gray-400 print:text-black">Conduct</th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-[var(--text-1)] print:text-black">
                        <span className="block">Weekly %</span>
                        <span className="block text-[9px] font-normal normal-case tracking-normal text-[var(--text-2)]">Academic only</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-2)] print:divide-gray-200">
                    {weeklyRows.map((row) => {
                      const hasWeeklyData = row.weeklyPercentage !== null;
                      const { background, text } = getPercentageColors(row.weeklyPercentage ?? 0, hasWeeklyData);
                      const includedCategories = [
                        row.test ? 'Test' : null,
                        row.classwork ? 'CW' : null,
                        row.homework ? 'HW' : null,
                      ].filter((category): category is string => category !== null);
                      const weeklyDescription = includedCategories.length === 3
                        ? 'All'
                        : includedCategories.length === 1 && includedCategories[0] === 'Test'
                          ? 'Test only'
                          : includedCategories.length > 0
                            ? includedCategories.join(' + ')
                            : 'No scores';
                      return (
                        <tr key={row.week} className="hover:bg-[var(--surface-2)] transition-colors print:odd:bg-white print:even:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-[var(--text-1)] print:text-black">Week {row.week}</td>
                          <td className="px-4 py-3 text-center font-mono text-xs print:text-black">
                            {row.test ? (
                              <span className="text-[var(--text-1)]">{row.test.score}/{row.test.total}</span>
                            ) : (
                              <span className="text-[var(--text-2)]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-xs print:text-black">
                            {row.classwork ? (
                              <span className="text-[var(--text-1)]">{row.classwork.score}/{row.classwork.total}</span>
                            ) : (
                              <span className="text-[var(--text-2)]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-mono text-xs print:text-black">
                            {row.homework ? (
                              <span className="text-[var(--text-1)]">{row.homework.score}/{row.homework.total}</span>
                            ) : (
                              <span className="text-[var(--text-2)]">—</span>
                            )}
                          </td>
                          <td className="border-l-2 border-[var(--border-2)] px-4 py-3 text-center font-mono text-xs print:border-gray-400 print:text-black">
                            {row.behavior !== undefined ? (
                              <span className="text-[var(--text-1)]">{row.behavior}</span>
                            ) : (
                              <span className="text-[var(--text-2)]">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">
                            {hasWeeklyData ? (
                              <span
                                className="inline-flex min-w-[58px] justify-center rounded-md px-2 py-1 font-bold"
                                style={{
                                  backgroundColor: background,
                                  color: text,
                                }}
                                title={`Calculated using ${weeklyDescription}`}
                              >
                                {`${row.weeklyPercentage!.toFixed(1)}%`}
                              </span>
                            ) : (
                              <span className="text-[var(--text-2)]" title="No scores">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

