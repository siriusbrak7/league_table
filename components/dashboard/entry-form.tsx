'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CURRENT_TERM, CURRENT_YEAR, GRADES } from '@/lib/config';
import type { Student, WeekConfig } from '@/types';

export interface EntryTotals {
  test: number;
  classwork: number;
  homework: number;
}

interface StudentWeekScores {
  test?: number;
  classwork?: number;
  homework?: number;
  behavior?: number;
}

interface EnabledCategories {
  test: boolean;
  classwork: boolean;
  homework: boolean;
}

interface EntryFormProps {
  students: Student[];
}

const DEFAULT_TOTALS: EntryTotals = {
  test: 15,
  classwork: 10,
  homework: 10,
};

export function EntryForm({ students }: EntryFormProps) {
  const [week, setWeek] = useState<number>(1);
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [weeksWithData, setWeeksWithData] = useState<Set<number>>(new Set());

  // Enabled categories state
  const [enabledCategories, setEnabledCategories] = useState<EnabledCategories>({
    test: true,
    classwork: true,
    homework: true,
  });

  // Totals for enabled categories
  const [totals, setTotals] = useState<EntryTotals>(DEFAULT_TOTALS);

  // Scores map: studentId -> { test, classwork, homework, behavior }
  const [scores, setScores] = useState<Record<string, StudentWeekScores>>({});
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Helper to fetch all weeks that have scores entered across all students
  const refreshWeeksWithData = useCallback(async () => {
    try {
      const [academicRes, behaviorRes] = await Promise.all([
        supabase
          .from('academic_scores')
          .select('week')
          .eq('term', CURRENT_TERM)
          .eq('year', CURRENT_YEAR),
        supabase
          .from('behavior_scores')
          .select('week')
          .eq('term', CURRENT_TERM)
          .eq('year', CURRENT_YEAR),
      ]);

      const weeksSet = new Set<number>();
      (academicRes.data || []).forEach((row) => weeksSet.add(row.week));
      (behaviorRes.data || []).forEach((row) => weeksSet.add(row.week));
      setWeeksWithData(weeksSet);
    } catch {
      // Ignore completeness fetch errors
    }
  }, [supabase]);

  // Initial load of weeks with data
  useEffect(() => {
    let isCancelled = false;

    async function loadWeeksWithData() {
      try {
        const [academicRes, behaviorRes] = await Promise.all([
          supabase
            .from('academic_scores')
            .select('week')
            .eq('term', CURRENT_TERM)
            .eq('year', CURRENT_YEAR),
          supabase
            .from('behavior_scores')
            .select('week')
            .eq('term', CURRENT_TERM)
            .eq('year', CURRENT_YEAR),
        ]);

        if (!isCancelled) {
          const weeksSet = new Set<number>();
          (academicRes.data || []).forEach((row) => weeksSet.add(row.week));
          (behaviorRes.data || []).forEach((row) => weeksSet.add(row.week));
          setWeeksWithData(weeksSet);
        }
      } catch {
        // Ignore completeness fetch errors
      }
    }

    loadWeeksWithData();

    return () => {
      isCancelled = true;
    };
  }, [supabase]);

  // Filter or group students based on selectedGrade
  const filteredStudents = useMemo(() => {
    if (selectedGrade === 'All') return students;
    return students.filter((s) => s.grade === selectedGrade);
  }, [students, selectedGrade]);

  // Grouped students when "All" is selected
  const studentsByGrade = useMemo(() => {
    const map = new Map<string, Student[]>();
    for (const g of GRADES) {
      map.set(g, []);
    }
    students.forEach((s) => {
      const existing = map.get(s.grade);
      if (existing) {
        existing.push(s);
      } else {
        map.set(s.grade, [s]);
      }
    });
    return map;
  }, [students]);

  // Load week_config and existing scores whenever selected week changes
  useEffect(() => {
    let isCancelled = false;

    async function loadWeekData() {
      if (students.length === 0) return;
      setLoadingExisting(true);
      setError(null);

      try {
        const [configRes, academicRes, behaviorRes] = await Promise.all([
          supabase
            .from('week_config')
            .select('*')
            .eq('term', CURRENT_TERM)
            .eq('year', CURRENT_YEAR)
            .eq('week', week),
          supabase
            .from('academic_scores')
            .select('*')
            .eq('term', CURRENT_TERM)
            .eq('year', CURRENT_YEAR)
            .eq('week', week),
          supabase
            .from('behavior_scores')
            .select('*')
            .eq('term', CURRENT_TERM)
            .eq('year', CURRENT_YEAR)
            .eq('week', week),
        ]);

        if (configRes.error) throw configRes.error;
        if (academicRes.error) throw academicRes.error;
        if (behaviorRes.error) throw behaviorRes.error;

        if (!isCancelled) {
          const configRows = (configRes.data as WeekConfig[]) || [];
          const academicRows = academicRes.data || [];
          const behaviorRows = behaviorRes.data || [];

          // Determine enabled categories strictly by presence of week_config row OR existing student score in that category
          const hasTestConfig = configRows.some((c) => c.category === 'test');
          const hasTestScore = academicRows.some((a) => a.category === 'test');
          const hasTest = hasTestConfig || hasTestScore;

          const hasClassworkConfig = configRows.some((c) => c.category === 'classwork');
          const hasClassworkScore = academicRows.some((a) => a.category === 'classwork');
          const hasClasswork = hasClassworkConfig || hasClassworkScore;

          const hasHomeworkConfig = configRows.some((c) => c.category === 'homework');
          const hasHomeworkScore = academicRows.some((a) => a.category === 'homework');
          const hasHomework = hasHomeworkConfig || hasHomeworkScore;

          const hasAnyConfigOrData = configRows.length > 0 || academicRows.length > 0;

          if (hasAnyConfigOrData) {
            setEnabledCategories({
              test: hasTest,
              classwork: hasClasswork,
              homework: hasHomework,
            });
          } else {
            // Fresh week with no config or scores — leave unchecked/disabled by default
            setEnabledCategories({
              test: false,
              classwork: false,
              homework: false,
            });
          }

          // Extract totals from week_config or academic_scores or fallback default
          const testConfig = configRows.find((c) => c.category === 'test');
          const testScoreRow = academicRows.find((a) => a.category === 'test');
          const testTotal = testConfig?.total ?? testScoreRow?.total ?? DEFAULT_TOTALS.test;

          const classworkConfig = configRows.find((c) => c.category === 'classwork');
          const classworkScoreRow = academicRows.find((a) => a.category === 'classwork');
          const classworkTotal =
            classworkConfig?.total ?? classworkScoreRow?.total ?? DEFAULT_TOTALS.classwork;

          const homeworkConfig = configRows.find((c) => c.category === 'homework');
          const homeworkScoreRow = academicRows.find((a) => a.category === 'homework');
          const homeworkTotal =
            homeworkConfig?.total ?? homeworkScoreRow?.total ?? DEFAULT_TOTALS.homework;

          setTotals({
            test: testTotal,
            classwork: classworkTotal,
            homework: homeworkTotal,
          });

          // Map student scores
          const loadedScores: Record<string, StudentWeekScores> = {};

          academicRows.forEach((row) => {
            if (!loadedScores[row.student_id]) {
              loadedScores[row.student_id] = {};
            }
            if (row.category === 'test') loadedScores[row.student_id].test = row.score;
            if (row.category === 'classwork') loadedScores[row.student_id].classwork = row.score;
            if (row.category === 'homework') loadedScores[row.student_id].homework = row.score;
          });

          behaviorRows.forEach((row) => {
            if (!loadedScores[row.student_id]) {
              loadedScores[row.student_id] = {};
            }
            loadedScores[row.student_id].behavior = row.score;
          });

          setScores(loadedScores);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch existing scores');
        }
      } finally {
        if (!isCancelled) {
          setLoadingExisting(false);
        }
      }
    }

    loadWeekData();

    return () => {
      isCancelled = true;
    };
  }, [students, week, supabase]);

  const handleScoreChange = (studentId: string, field: keyof StudentWeekScores, valStr: string) => {
    const val = valStr === '' ? undefined : Number(valStr);
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val,
      },
    }));
  };

  const validateAndSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Validate category totals
      if (enabledCategories.test && totals.test < 1) {
        throw new Error('Test total must be at least 1');
      }
      if (enabledCategories.classwork && totals.classwork < 1) {
        throw new Error('Classwork total must be at least 1');
      }
      if (enabledCategories.homework && totals.homework < 1) {
        throw new Error('Homework total must be at least 1');
      }

      // 1. Prepare week_config upserts for enabled categories
      const weekConfigUpserts = [];
      if (enabledCategories.test) {
        weekConfigUpserts.push({
          term: CURRENT_TERM,
          year: CURRENT_YEAR,
          week,
          category: 'test',
          total: totals.test,
        });
      }
      if (enabledCategories.classwork) {
        weekConfigUpserts.push({
          term: CURRENT_TERM,
          year: CURRENT_YEAR,
          week,
          category: 'classwork',
          total: totals.classwork,
        });
      }
      if (enabledCategories.homework) {
        weekConfigUpserts.push({
          term: CURRENT_TERM,
          year: CURRENT_YEAR,
          week,
          category: 'homework',
          total: totals.homework,
        });
      }

      if (weekConfigUpserts.length > 0) {
        const { error: configError } = await supabase.from('week_config').upsert(weekConfigUpserts, {
          onConflict: 'term,year,week,category',
        });
        if (configError) throw configError;
      }

      // 2. Prepare score upserts
      const academicUpserts: {
        student_id: string;
        week: number;
        category: string;
        score: number;
        total: number;
        term: string;
        year: number;
      }[] = [];

      const behaviorUpserts: {
        student_id: string;
        week: number;
        score: number;
        term: string;
        year: number;
      }[] = [];

      for (const [studentId, studentScores] of Object.entries(scores)) {
        if (!studentScores) continue;

        // Test score if category is enabled
        if (enabledCategories.test && studentScores.test !== undefined && !isNaN(studentScores.test)) {
          if (studentScores.test < 0 || studentScores.test > totals.test) {
            throw new Error(`Test scores must be between 0 and ${totals.test}`);
          }
          academicUpserts.push({
            student_id: studentId,
            week,
            category: 'test',
            score: studentScores.test,
            total: totals.test,
            term: CURRENT_TERM,
            year: CURRENT_YEAR,
          });
        }

        // Classwork score if category is enabled
        if (
          enabledCategories.classwork &&
          studentScores.classwork !== undefined &&
          !isNaN(studentScores.classwork)
        ) {
          if (studentScores.classwork < 0 || studentScores.classwork > totals.classwork) {
            throw new Error(`Classwork scores must be between 0 and ${totals.classwork}`);
          }
          academicUpserts.push({
            student_id: studentId,
            week,
            category: 'classwork',
            score: studentScores.classwork,
            total: totals.classwork,
            term: CURRENT_TERM,
            year: CURRENT_YEAR,
          });
        }

        // Homework score if category is enabled
        if (
          enabledCategories.homework &&
          studentScores.homework !== undefined &&
          !isNaN(studentScores.homework)
        ) {
          if (studentScores.homework < 0 || studentScores.homework > totals.homework) {
            throw new Error(`Homework scores must be between 0 and ${totals.homework}`);
          }
          academicUpserts.push({
            student_id: studentId,
            week,
            category: 'homework',
            score: studentScores.homework,
            total: totals.homework,
            term: CURRENT_TERM,
            year: CURRENT_YEAR,
          });
        }

        // Behavior score (always independent)
        if (studentScores.behavior !== undefined && !isNaN(studentScores.behavior)) {
          if (studentScores.behavior < 0 || studentScores.behavior > 100) {
            throw new Error('Behavior scores must be between 0 and 100');
          }
          behaviorUpserts.push({
            student_id: studentId,
            week,
            score: studentScores.behavior,
            term: CURRENT_TERM,
            year: CURRENT_YEAR,
          });
        }
      }

      // Upsert academic scores
      if (academicUpserts.length > 0) {
        const { error: academicError } = await supabase
          .from('academic_scores')
          .upsert(academicUpserts, {
            onConflict: 'student_id,term,year,week,category',
          });

        if (academicError) throw academicError;
      }

      // Upsert behavior scores
      if (behaviorUpserts.length > 0) {
        const { error: behaviorError } = await supabase
          .from('behavior_scores')
          .upsert(behaviorUpserts, {
            onConflict: 'student_id,term,year,week',
          });

        if (behaviorError) throw behaviorError;
      }

      setSuccess(true);
      await refreshWeeksWithData();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scores');
    } finally {
      setLoading(false);
    }
  };

  const renderStudentRow = (student: Student) => {
    const studentScore = scores[student.id] || {};

    const isTestExceeded =
      enabledCategories.test &&
      studentScore.test !== undefined &&
      (studentScore.test < 0 || studentScore.test > totals.test);

    const isClassworkExceeded =
      enabledCategories.classwork &&
      studentScore.classwork !== undefined &&
      (studentScore.classwork < 0 || studentScore.classwork > totals.classwork);

    const isHomeworkExceeded =
      enabledCategories.homework &&
      studentScore.homework !== undefined &&
      (studentScore.homework < 0 || studentScore.homework > totals.homework);

    const isBehaviorExceeded =
      studentScore.behavior !== undefined &&
      (studentScore.behavior < 0 || studentScore.behavior > 100);

    return (
      <tr key={student.id} className="hover:bg-blue-50/60 transition-colors">
        <td className="px-4 py-3 text-sm font-semibold text-gray-950 whitespace-nowrap">
          {student.name}
          {selectedGrade === 'All' && (
            <span className="ml-1.5 text-xs text-gray-500 font-medium">(G{student.grade})</span>
          )}
        </td>

        {/* Test Score */}
        {enabledCategories.test && (
          <td className="px-3 py-3 whitespace-nowrap">
            <div className="flex items-center">
              <input
                type="number"
                min="0"
                max={totals.test}
                placeholder="0"
                value={studentScore.test !== undefined ? studentScore.test : ''}
                onChange={(e) => handleScoreChange(student.id, 'test', e.target.value)}
                className={`w-20 px-2.5 py-1.5 border-2 rounded-lg text-gray-900 text-sm font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  isTestExceeded
                    ? 'border-red-600 bg-red-50 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-400 bg-white focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              <span className="ml-1.5 text-gray-600 text-xs font-semibold">/ {totals.test}</span>
            </div>
          </td>
        )}

        {/* Classwork Score */}
        {enabledCategories.classwork && (
          <td className="px-3 py-3 whitespace-nowrap">
            <div className="flex items-center">
              <input
                type="number"
                min="0"
                max={totals.classwork}
                placeholder="0"
                value={studentScore.classwork !== undefined ? studentScore.classwork : ''}
                onChange={(e) => handleScoreChange(student.id, 'classwork', e.target.value)}
                className={`w-20 px-2.5 py-1.5 border-2 rounded-lg text-gray-900 text-sm font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  isClassworkExceeded
                    ? 'border-red-600 bg-red-50 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-400 bg-white focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              <span className="ml-1.5 text-gray-600 text-xs font-semibold">/ {totals.classwork}</span>
            </div>
          </td>
        )}

        {/* Homework Score */}
        {enabledCategories.homework && (
          <td className="px-3 py-3 whitespace-nowrap">
            <div className="flex items-center">
              <input
                type="number"
                min="0"
                max={totals.homework}
                placeholder="0"
                value={studentScore.homework !== undefined ? studentScore.homework : ''}
                onChange={(e) => handleScoreChange(student.id, 'homework', e.target.value)}
                className={`w-20 px-2.5 py-1.5 border-2 rounded-lg text-gray-900 text-sm font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  isHomeworkExceeded
                    ? 'border-red-600 bg-red-50 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-400 bg-white focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              <span className="ml-1.5 text-gray-600 text-xs font-semibold">/ {totals.homework}</span>
            </div>
          </td>
        )}

        {/* Behavior Score */}
        <td className="px-3 py-3 whitespace-nowrap">
          <div className="flex items-center">
            <input
              type="number"
              min="0"
              max="100"
              placeholder="0"
              value={studentScore.behavior !== undefined ? studentScore.behavior : ''}
              onChange={(e) => handleScoreChange(student.id, 'behavior', e.target.value)}
              className={`w-20 px-2.5 py-1.5 border-2 rounded-lg text-gray-900 text-sm font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 ${
                isBehaviorExceeded
                  ? 'border-red-600 bg-red-50 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-400 bg-white focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            <span className="ml-1.5 text-gray-600 text-xs font-semibold">/ 100</span>
          </div>
        </td>
      </tr>
    );
  };

  const renderTableHead = () => (
    <thead className="bg-gray-100">
      <tr>
        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Student</th>
        {enabledCategories.test && (
          <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
            Test ({totals.test})
          </th>
        )}
        {enabledCategories.classwork && (
          <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
            Classwork ({totals.classwork})
          </th>
        )}
        {enabledCategories.homework && (
          <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
            Homework ({totals.homework})
          </th>
        )}
        <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
          Behavior (0–100)
        </th>
      </tr>
    </thead>
  );

  return (
    <div>
      {/* Top of Form: Week Dropdown & Grade Filter */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <label htmlFor="entry-week" className="block text-sm font-semibold text-gray-800 mb-1.5">
              Week
            </label>
            <select
              id="entry-week"
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="w-full px-4 py-2.5 text-gray-900 font-medium bg-white border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w} className="text-gray-900 bg-white">
                  Week {w}{weeksWithData.has(w) ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="entry-grade-filter" className="block text-sm font-semibold text-gray-800 mb-1.5">
              Grade Filter
            </label>
            <select
              id="entry-grade-filter"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full px-4 py-2.5 text-gray-900 font-medium bg-white border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            >
              <option value="All" className="text-gray-900 bg-white">
                All Grades
              </option>
              {GRADES.map((g) => (
                <option key={g} value={g} className="text-gray-900 bg-white">
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Week Progress Strip */}
        <div className="mt-5 pt-4 border-t border-gray-200">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Week Progress
          </label>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
              const hasData = weeksWithData.has(w);
              const isSelected = w === week;

              let pillStyle =
                'px-3 py-1 text-xs font-semibold rounded-md border transition cursor-pointer flex items-center gap-1.5';
              if (isSelected) {
                pillStyle +=
                  ' bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500 ring-offset-1 font-bold';
              } else if (hasData) {
                pillStyle += ' bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
              } else {
                pillStyle += ' bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200';
              }

              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeek(w)}
                  className={pillStyle}
                >
                  <span>Week {w}</span>
                  {hasData && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Overwrite Warning Banner */}
        {weeksWithData.has(week) && (
          <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm font-medium text-yellow-800 flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>
              Week {week} already has scores entered. Any changes you save will update existing values.
            </span>
          </div>
        )}
      </div>

      {/* Category Toggles & Totals Row */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <div className="text-sm font-semibold text-gray-800 mb-3 flex items-center justify-between">
          <span>Academic Categories & Category Totals</span>
          <span className="text-xs text-gray-500 font-normal">Enable categories and set totals for Week {week}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Test Toggle & Total */}
          <div className="p-3.5 border-2 border-gray-300 rounded-lg bg-gray-50/70">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-900 mb-2">
              <input
                type="checkbox"
                checked={enabledCategories.test}
                onChange={(e) => setEnabledCategories((prev) => ({ ...prev, test: e.target.checked }))}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-400 cursor-pointer"
              />
              <span>Test</span>
            </label>
            {enabledCategories.test ? (
              <div>
                <label htmlFor="total-test" className="block text-xs font-semibold text-gray-700 mb-1">
                  Test Total
                </label>
                <input
                  id="total-test"
                  type="number"
                  min="1"
                  value={totals.test}
                  onChange={(e) => setTotals((prev) => ({ ...prev, test: Math.max(1, Number(e.target.value) || 0) }))}
                  className="w-full px-3 py-2 text-gray-900 font-medium bg-white border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">Category disabled for Week {week}</p>
            )}
          </div>

          {/* Classwork Toggle & Total */}
          <div className="p-3.5 border-2 border-gray-300 rounded-lg bg-gray-50/70">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-900 mb-2">
              <input
                type="checkbox"
                checked={enabledCategories.classwork}
                onChange={(e) => setEnabledCategories((prev) => ({ ...prev, classwork: e.target.checked }))}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-400 cursor-pointer"
              />
              <span>Classwork</span>
            </label>
            {enabledCategories.classwork ? (
              <div>
                <label htmlFor="total-classwork" className="block text-xs font-semibold text-gray-700 mb-1">
                  Classwork Total
                </label>
                <input
                  id="total-classwork"
                  type="number"
                  min="1"
                  value={totals.classwork}
                  onChange={(e) => setTotals((prev) => ({ ...prev, classwork: Math.max(1, Number(e.target.value) || 0) }))}
                  className="w-full px-3 py-2 text-gray-900 font-medium bg-white border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">Category disabled for Week {week}</p>
            )}
          </div>

          {/* Homework Toggle & Total */}
          <div className="p-3.5 border-2 border-gray-300 rounded-lg bg-gray-50/70">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-gray-900 mb-2">
              <input
                type="checkbox"
                checked={enabledCategories.homework}
                onChange={(e) => setEnabledCategories((prev) => ({ ...prev, homework: e.target.checked }))}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-400 cursor-pointer"
              />
              <span>Homework</span>
            </label>
            {enabledCategories.homework ? (
              <div>
                <label htmlFor="total-homework" className="block text-xs font-semibold text-gray-700 mb-1">
                  Homework Total
                </label>
                <input
                  id="total-homework"
                  type="number"
                  min="1"
                  value={totals.homework}
                  onChange={(e) => setTotals((prev) => ({ ...prev, homework: Math.max(1, Number(e.target.value) || 0) }))}
                  className="w-full px-3 py-2 text-gray-900 font-medium bg-white border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">Category disabled for Week {week}</p>
            )}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">✓ Scores and week configuration saved successfully</p>
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {loadingExisting && (
        <div className="mb-4 text-sm text-gray-500">
          Loading configuration and scores for Week {week}...
        </div>
      )}

      {/* Main Table */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 mb-6">
          No students found for {selectedGrade === 'All' ? 'the selected filter' : `Grade ${selectedGrade}`}.
        </div>
      ) : selectedGrade === 'All' ? (
        <div className="space-y-6">
          {GRADES.map((grade) => {
            const gradeStudents = studentsByGrade.get(grade) || [];
            if (gradeStudents.length === 0) return null;

            return (
              <div key={grade} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-blue-900 px-6 py-3 border-b border-blue-950 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Grade {grade}
                  </h3>
                  <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                    {gradeStudents.length} {gradeStudents.length === 1 ? 'Student' : 'Students'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    {renderTableHead()}
                    <tbody className="divide-y divide-gray-200">
                      {gradeStudents.map(renderStudentRow)}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-blue-900 px-6 py-3 border-b border-blue-950 flex items-center justify-between">
            <h3 className="text-base font-bold text-white tracking-wide">
              Grade {selectedGrade}
            </h3>
            <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
              {filteredStudents.length} {filteredStudents.length === 1 ? 'Student' : 'Students'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              {renderTableHead()}
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map(renderStudentRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-6">
        <button
          onClick={validateAndSubmit}
          disabled={loading || loadingExisting}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 cursor-pointer shadow-sm"
        >
          {loading ? 'Saving...' : 'Save Scores'}
        </button>
      </div>
    </div>
  );
}
