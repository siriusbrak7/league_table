'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CURRENT_TERM, CURRENT_YEAR, GRADES } from '@/lib/config';
import type { Student } from '@/types';

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

interface EntryFormProps {
  students: Student[];
}

const STORAGE_KEY = 'physics-league-entry-totals';

const DEFAULT_TOTALS: EntryTotals = {
  test: 15,
  classwork: 10,
  homework: 10,
};

export function EntryForm({ students }: EntryFormProps) {
  const [week, setWeek] = useState<number>(1);
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  
  // Persisted totals in localStorage
  const [totals, setTotals] = useState<EntryTotals>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<EntryTotals>;
          return {
            test: typeof parsed.test === 'number' ? parsed.test : DEFAULT_TOTALS.test,
            classwork: typeof parsed.classwork === 'number' ? parsed.classwork : DEFAULT_TOTALS.classwork,
            homework: typeof parsed.homework === 'number' ? parsed.homework : DEFAULT_TOTALS.homework,
          };
        }
      } catch {
        // Ignore storage errors
      }
    }
    return DEFAULT_TOTALS;
  });

  // Scores map: studentId -> { test, classwork, homework, behavior }
  const [scores, setScores] = useState<Record<string, StudentWeekScores>>({});
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Update total inputs and sync to localStorage
  const handleTotalChange = (cat: keyof EntryTotals, valStr: string) => {
    const num = Math.max(1, Number(valStr) || 0);
    const updated = { ...totals, [cat]: num };
    setTotals(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
    }
  };

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

  // Load existing scores for this week whenever week changes
  useEffect(() => {
    let isCancelled = false;

    async function loadWeekScores() {
      if (students.length === 0) return;
      setLoadingExisting(true);
      setError(null);

      try {
        const [academicRes, behaviorRes] = await Promise.all([
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

        if (academicRes.error) throw academicRes.error;
        if (behaviorRes.error) throw behaviorRes.error;

        if (!isCancelled) {
          const loaded: Record<string, StudentWeekScores> = {};

          (academicRes.data || []).forEach((row) => {
            if (!loaded[row.student_id]) {
              loaded[row.student_id] = {};
            }
            if (row.category === 'test') loaded[row.student_id].test = row.score;
            if (row.category === 'classwork') loaded[row.student_id].classwork = row.score;
            if (row.category === 'homework') loaded[row.student_id].homework = row.score;
          });

          (behaviorRes.data || []).forEach((row) => {
            if (!loaded[row.student_id]) {
              loaded[row.student_id] = {};
            }
            loaded[row.student_id].behavior = row.score;
          });

          setScores(loaded);
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

    loadWeekScores();

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

      // Validate & gather entries across all students
      for (const [studentId, studentScores] of Object.entries(scores)) {
        if (!studentScores) continue;

        // Test
        if (studentScores.test !== undefined && !isNaN(studentScores.test)) {
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

        // Classwork
        if (studentScores.classwork !== undefined && !isNaN(studentScores.classwork)) {
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

        // Homework
        if (studentScores.homework !== undefined && !isNaN(studentScores.homework)) {
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

        // Behavior
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
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scores');
    } finally {
      setLoading(false);
    }
  };

  const renderStudentRow = (student: Student) => {
    const studentScore = scores[student.id] || {};

    return (
      <tr key={student.id} className="hover:bg-blue-50/60 transition-colors">
        <td className="px-4 py-3 text-sm font-semibold text-gray-950 whitespace-nowrap">
          {student.name}
          {selectedGrade === 'All' && (
            <span className="ml-1.5 text-xs text-gray-500 font-medium">(G{student.grade})</span>
          )}
        </td>

        {/* Test Score */}
        <td className="px-3 py-3 whitespace-nowrap">
          <div className="flex items-center">
            <input
              type="number"
              min="0"
              max={totals.test}
              placeholder="0"
              value={studentScore.test !== undefined ? studentScore.test : ''}
              onChange={(e) => handleScoreChange(student.id, 'test', e.target.value)}
              className="w-20 px-2.5 py-1.5 border-2 border-gray-400 rounded-lg text-gray-900 text-sm font-semibold placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="ml-1.5 text-gray-600 text-xs font-semibold">/ {totals.test}</span>
          </div>
        </td>

        {/* Classwork Score */}
        <td className="px-3 py-3 whitespace-nowrap">
          <div className="flex items-center">
            <input
              type="number"
              min="0"
              max={totals.classwork}
              placeholder="0"
              value={studentScore.classwork !== undefined ? studentScore.classwork : ''}
              onChange={(e) => handleScoreChange(student.id, 'classwork', e.target.value)}
              className="w-20 px-2.5 py-1.5 border-2 border-gray-400 rounded-lg text-gray-900 text-sm font-semibold placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="ml-1.5 text-gray-600 text-xs font-semibold">/ {totals.classwork}</span>
          </div>
        </td>

        {/* Homework Score */}
        <td className="px-3 py-3 whitespace-nowrap">
          <div className="flex items-center">
            <input
              type="number"
              min="0"
              max={totals.homework}
              placeholder="0"
              value={studentScore.homework !== undefined ? studentScore.homework : ''}
              onChange={(e) => handleScoreChange(student.id, 'homework', e.target.value)}
              className="w-20 px-2.5 py-1.5 border-2 border-gray-400 rounded-lg text-gray-900 text-sm font-semibold placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="ml-1.5 text-gray-600 text-xs font-semibold">/ {totals.homework}</span>
          </div>
        </td>

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
              className="w-20 px-2.5 py-1.5 border-2 border-gray-400 rounded-lg text-gray-900 text-sm font-semibold placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
          Test ({totals.test})
        </th>
        <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
          Classwork ({totals.classwork})
        </th>
        <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
          Homework ({totals.homework})
        </th>
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
                  Week {w}
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
              <option value="All" className="text-gray-900 bg-white">All Grades</option>
              {GRADES.map((g) => (
                <option key={g} value={g} className="text-gray-900 bg-white">
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Set Totals Row */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <div className="text-sm font-semibold text-gray-800 mb-3 flex items-center justify-between">
          <span>Set Category Totals</span>
          <span className="text-xs text-gray-500 font-normal">Auto-saved for calculations</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="total-test" className="block text-xs font-semibold text-gray-700 mb-1">
              Test Total
            </label>
            <input
              id="total-test"
              type="number"
              min="1"
              value={totals.test}
              onChange={(e) => handleTotalChange('test', e.target.value)}
              className="w-full px-3 py-2 text-gray-900 font-medium bg-white border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="total-classwork" className="block text-xs font-semibold text-gray-700 mb-1">
              Classwork Total
            </label>
            <input
              id="total-classwork"
              type="number"
              min="1"
              value={totals.classwork}
              onChange={(e) => handleTotalChange('classwork', e.target.value)}
              className="w-full px-3 py-2 text-gray-900 font-medium bg-white border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="total-homework" className="block text-xs font-semibold text-gray-700 mb-1">
              Homework Total
            </label>
            <input
              id="total-homework"
              type="number"
              min="1"
              value={totals.homework}
              onChange={(e) => handleTotalChange('homework', e.target.value)}
              className="w-full px-3 py-2 text-gray-900 font-medium bg-white border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">✓ Scores saved successfully</p>
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {loadingExisting && (
        <div className="mb-4 text-sm text-gray-500">
          Loading existing scores for Week {week}...
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
