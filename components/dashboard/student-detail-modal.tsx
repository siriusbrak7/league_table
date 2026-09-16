'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CURRENT_TERM, CURRENT_YEAR } from '@/lib/config';
import { calculateWeeklyPercentage } from '@/lib/utils/calculations';
import { getPercentageColors } from '@/lib/utils/colors';
import { processGradeData } from '@/lib/utils/processGradeData';
import type { Student, AcademicScore, BehaviorScore } from '@/types';

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

        // Fetch academic scores for current term & year
        const { data: academicScores, error: academicErr } = await supabase
          .from('academic_scores')
          .select('*')
          .eq('term', CURRENT_TERM)
          .eq('year', CURRENT_YEAR);

        if (academicErr) throw academicErr;

        // Fetch behavior scores for current term & year
        const { data: behaviorScores, error: behaviorErr } = await supabase
          .from('behavior_scores')
          .select('*')
          .eq('term', CURRENT_TERM)
          .eq('year', CURRENT_YEAR);

        if (behaviorErr) throw behaviorErr;

        // Process data for student's grade
        const gradeData = processGradeData(
          student.grade,
          gradeStudents ?? [],
          (academicScores as AcademicScore[]) ?? [],
          (behaviorScores as BehaviorScore[]) ?? []
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

          const weeklyPercentage = calculateWeeklyPercentage(test, classwork, homework);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:p-0 print:bg-transparent print:static print:inset-auto print:block"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-gray-900 print:max-w-none print:w-full print:max-h-none print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 print:bg-white print:border-b-2 print:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
            <p className="text-sm text-gray-600">
              Grade {student.grade} &bull; {CURRENT_TERM} {CURRENT_YEAR} Full Score History
            </p>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition cursor-pointer"
            >
              Print this view
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md transition cursor-pointer"
              aria-label="Close modal"
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
            <div className="py-12 text-center text-gray-500 font-medium">Loading student history...</div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>
          ) : (
            <>
              {/* Weekly Scores Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Week
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Test (50%)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Classwork (30%)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Homework (20%)
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Behavior
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Weekly %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    {weeklyRows.map((row) => {
                      const hasWeeklyData = row.weeklyPercentage !== null;
                      const { background, text } = getPercentageColors(
                        row.weeklyPercentage ?? 0,
                        hasWeeklyData
                      );

                      return (
                        <tr key={row.week} className="odd:bg-white even:bg-gray-50">
                          <td className="px-4 py-2.5 font-semibold text-gray-700">
                            Week {row.week}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-800">
                            {row.test ? `${row.test.score}/${row.test.total}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-800">
                            {row.classwork ? `${row.classwork.score}/${row.classwork.total}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-800">
                            {row.homework ? `${row.homework.score}/${row.homework.total}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-800">
                            {row.behavior !== undefined ? row.behavior : '—'}
                          </td>
                          <td
                            className="px-4 py-2.5 text-right font-bold"
                            style={{ backgroundColor: background, color: text }}
                          >
                            {hasWeeklyData ? `${row.weeklyPercentage!.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="p-3 bg-white border border-gray-200 rounded-md">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Overall Weighted %</div>
                  <div
                    className="text-lg font-bold mt-1 inline-block px-2 py-0.5 rounded"
                    style={{ backgroundColor: overallAcColors.background, color: overallAcColors.text }}
                  >
                    {hasAcademicData ? `${overallAcademicPct.toFixed(1)}%` : '—'}
                  </div>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-md">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Academic Rank</div>
                  <div className="text-lg font-bold text-gray-900 mt-1">
                    {hasAcademicData && academicRank !== null ? `#${academicRank}` : '—'}
                  </div>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-md">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Behavior Average</div>
                  <div
                    className="text-lg font-bold mt-1 inline-block px-2 py-0.5 rounded"
                    style={{ backgroundColor: behaviorAvgColors.background, color: behaviorAvgColors.text }}
                  >
                    {hasBehaviorData ? `${behaviorAvg.toFixed(1)}%` : '—'}
                  </div>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-md">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Behavior Rank</div>
                  <div className="text-lg font-bold text-gray-900 mt-1">
                    {hasBehaviorData && behaviorRank !== null ? `#${behaviorRank}` : '—'}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
