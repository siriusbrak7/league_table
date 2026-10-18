'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CURRENT_TERM, CURRENT_YEAR, GRADES } from '@/lib/config';
import type { Student, WeekConfig } from '@/types';

export interface EntryTotals {
  test: number | null;
  classwork: number | null;
  homework: number | null;
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

  // Track initially loaded categories and scores to support deletions and cleared scores
  const [initialCategories, setInitialCategories] = useState<EnabledCategories>({
    test: false,
    classwork: false,
    homework: false,
  });
  const [initialScores, setInitialScores] = useState<Record<string, StudentWeekScores>>({});

  // Totals for enabled categories
  const [totals, setTotals] = useState<EntryTotals>({ test: null, classwork: null, homework: null });

  // Scores map: studentId -> { test, classwork, homework, behavior }
  const [scores, setScores] = useState<Record<string, StudentWeekScores>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Filter or group students based on selectedGrade with defensive string coercion
  const filteredStudents = useMemo(() => {
    if (selectedGrade === 'All') return students;
    return students.filter((s) => String(s.grade) === selectedGrade);
  }, [students, selectedGrade]);

  // Grouped students when "All" is selected
  const studentsByGrade = useMemo(() => {
    const map = new Map<string, Student[]>();
    for (const g of GRADES) {
      map.set(g, []);
    }
    students.forEach((s) => {
      const gStr = String(s.grade);
      const existing = map.get(gStr);
      if (existing) {
        existing.push(s);
      } else {
        map.set(gStr, [s]);
      }
    });
    return map;
  }, [students]);

  // Load weeks with data scoped to the selected grade
  useEffect(() => {
    let isCancelled = false;

    async function loadWeeks() {
      try {
        let academicQuery = supabase
          .from('academic_scores')
          .select('week, student_id')
          .eq('term', CURRENT_TERM)
          .eq('year', CURRENT_YEAR);

        let behaviorQuery = supabase
          .from('behavior_scores')
          .select('week, student_id')
          .eq('term', CURRENT_TERM)
          .eq('year', CURRENT_YEAR);

        if (selectedGrade !== 'All') {
          const gradeIds = students
            .filter((s) => String(s.grade) === selectedGrade)
            .map((s) => s.id);

          if (gradeIds.length === 0) {
            if (!isCancelled) setWeeksWithData(new Set());
            return;
          }

          academicQuery = academicQuery.in('student_id', gradeIds);
          behaviorQuery = behaviorQuery.in('student_id', gradeIds);
        }

        const [academicRes, behaviorRes] = await Promise.all([
          academicQuery,
          behaviorQuery,
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

    loadWeeks();

    return () => {
      isCancelled = true;
    };
  }, [supabase, selectedGrade, students]);

  // Helper to re-fetch all weeks that have scores entered, scoped to the selected grade
  const refreshWeeksWithData = useCallback(async () => {
    try {
      let academicQuery = supabase
        .from('academic_scores')
        .select('week, student_id')
        .eq('term', CURRENT_TERM)
        .eq('year', CURRENT_YEAR);

      let behaviorQuery = supabase
        .from('behavior_scores')
        .select('week, student_id')
        .eq('term', CURRENT_TERM)
        .eq('year', CURRENT_YEAR);

      if (selectedGrade !== 'All') {
        const gradeIds = students
          .filter((s) => String(s.grade) === selectedGrade)
          .map((s) => s.id);

        if (gradeIds.length === 0) {
          setWeeksWithData(new Set());
          return;
        }

        academicQuery = academicQuery.in('student_id', gradeIds);
        behaviorQuery = behaviorQuery.in('student_id', gradeIds);
      }

      const [academicRes, behaviorRes] = await Promise.all([
        academicQuery,
        behaviorQuery,
      ]);

      const weeksSet = new Set<number>();
      (academicRes.data || []).forEach((row) => weeksSet.add(row.week));
      (behaviorRes.data || []).forEach((row) => weeksSet.add(row.week));
      setWeeksWithData(weeksSet);
    } catch {
      // Ignore completeness fetch errors
    }
  }, [supabase, selectedGrade, students]);

  // Guard unsaved changes when user attempts to close or reload window
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Load grade-specific configuration and existing scores whenever the week or grade changes.
  useEffect(() => {
    let isCancelled = false;

    async function loadWeekData() {
      if (students.length === 0) return;
      setLoadingExisting(true);
      setError(null);
      setEnabledCategories({ test: false, classwork: false, homework: false });
      setTotals({ test: null, classwork: null, homework: null });

      try {
        let academicQuery = supabase
          .from('academic_scores')
          .select('*')
          .eq('term', CURRENT_TERM)
          .eq('year', CURRENT_YEAR)
          .eq('week', week);

        let behaviorQuery = supabase
          .from('behavior_scores')
          .select('*')
          .eq('term', CURRENT_TERM)
          .eq('year', CURRENT_YEAR)
          .eq('week', week);

        if (selectedGrade !== 'All') {
          const gradeIds = students
            .filter((s) => String(s.grade) === selectedGrade)
            .map((s) => s.id);

          if (gradeIds.length > 0) {
            academicQuery = academicQuery.in('student_id', gradeIds);
            behaviorQuery = behaviorQuery.in('student_id', gradeIds);
          }
        }

        const [academicRes, behaviorRes] = await Promise.all([
          academicQuery,
          behaviorQuery,
        ]);

        if (academicRes.error) throw academicRes.error;
        if (behaviorRes.error) throw behaviorRes.error;

        let configRows: WeekConfig[] = [];
        if (selectedGrade !== 'All') {
          const configRes = await supabase
            .from('week_config')
            .select('*')
            .eq('term', CURRENT_TERM)
            .eq('year', CURRENT_YEAR)
            .eq('week', week)
            .eq('grade', selectedGrade);
          if (configRes.error) throw configRes.error;
          configRows = (configRes.data as WeekConfig[]) || [];
        }

        if (!isCancelled) {
          const academicRows = academicRes.data || [];
          const behaviorRows = behaviorRes.data || [];

          const loadedCategories: EnabledCategories = {
            test: configRows.some((c) => c.category === 'test'),
            classwork: configRows.some((c) => c.category === 'classwork'),
            homework: configRows.some((c) => c.category === 'homework'),
          };

          if (selectedGrade !== 'All') {
            setEnabledCategories(loadedCategories);
            setInitialCategories(loadedCategories);
          }

          // Totals come only from the selected grade's week_config rows.
          const testConfig = configRows.find((c) => c.category === 'test');
          const classworkConfig = configRows.find((c) => c.category === 'classwork');
          const homeworkConfig = configRows.find((c) => c.category === 'homework');
          setTotals({
            test: testConfig?.total ?? null,
            classwork: classworkConfig?.total ?? null,
            homework: homeworkConfig?.total ?? null,
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
          setInitialScores(loadedScores);
          setHasUnsavedChanges(false);
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
  }, [students, week, selectedGrade, supabase]);

  const handleGradeChange = (nextGrade: string) => {
    if (nextGrade === selectedGrade) return;
    if (
      hasUnsavedChanges &&
      !window.confirm('You have unsaved changes. Discard them and switch grades?')
    ) {
      return;
    }

    setScores({});
    setHasUnsavedChanges(false);
    setSelectedGrade(nextGrade);
  };

  const handleWeekChange = (nextWeek: number) => {
    if (nextWeek === week) return;
    if (
      hasUnsavedChanges &&
      !window.confirm('You have unsaved changes. Discard them and switch weeks?')
    ) {
      return;
    }

    setScores({});
    setHasUnsavedChanges(false);
    setWeek(nextWeek);
  };

  const handleScoreChange = (studentId: string, field: keyof StudentWeekScores, valStr: string) => {
    const val = valStr === '' ? undefined : Number(valStr);
    setHasUnsavedChanges(true);
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val,
      },
    }));
  };

  const validateAndSubmit = async () => {
    if (selectedGrade === 'All') {
      setError('Select a specific grade to save scores.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Validate category totals for enabled categories
      if (enabledCategories.test && (totals.test === null || totals.test < 1)) {
        throw new Error('Set total for Test before saving.');
      }
      if (enabledCategories.classwork && (totals.classwork === null || totals.classwork < 1)) {
        throw new Error('Set total for Classwork before saving.');
      }
      if (enabledCategories.homework && (totals.homework === null || totals.homework < 1)) {
        throw new Error('Set total for Homework before saving.');
      }

      const testTotal = totals.test ?? 0;
      const classworkTotal = totals.classwork ?? 0;
      const homeworkTotal = totals.homework ?? 0;

      // 1. Prepare week_config upserts for enabled categories
      const weekConfigUpserts = [];
      if (enabledCategories.test) {
        weekConfigUpserts.push({
          term: CURRENT_TERM,
          year: CURRENT_YEAR,
          week,
          grade: selectedGrade,
          category: 'test',
          total: testTotal,
        });
      }
      if (enabledCategories.classwork) {
        weekConfigUpserts.push({
          term: CURRENT_TERM,
          year: CURRENT_YEAR,
          week,
          grade: selectedGrade,
          category: 'classwork',
          total: classworkTotal,
        });
      }
      if (enabledCategories.homework) {
        weekConfigUpserts.push({
          term: CURRENT_TERM,
          year: CURRENT_YEAR,
          week,
          grade: selectedGrade,
          category: 'homework',
          total: homeworkTotal,
        });
      }

      if (weekConfigUpserts.length > 0) {
        const { error: configError } = await supabase.from('week_config').upsert(weekConfigUpserts, {
          onConflict: 'term,year,week,grade,category',
        });
        if (configError) throw configError;
      }

      // Handle disabled categories: delete week_config and student scores for that category
      const disabledCategories: string[] = [];
      if (!enabledCategories.test && initialCategories.test) disabledCategories.push('test');
      if (!enabledCategories.classwork && initialCategories.classwork) disabledCategories.push('classwork');
      if (!enabledCategories.homework && initialCategories.homework) disabledCategories.push('homework');

      const gradeStudentIds = filteredStudents.map((s) => s.id);

      if (disabledCategories.length > 0) {
        const { error: delConfigError } = await supabase
          .from('week_config')
          .delete()
          .eq('term', CURRENT_TERM)
          .eq('year', CURRENT_YEAR)
          .eq('week', week)
          .eq('grade', selectedGrade)
          .in('category', disabledCategories);
        if (delConfigError) throw delConfigError;

        if (gradeStudentIds.length > 0) {
          const { error: delScoresError } = await supabase
            .from('academic_scores')
            .delete()
            .eq('term', CURRENT_TERM)
            .eq('year', CURRENT_YEAR)
            .eq('week', week)
            .in('student_id', gradeStudentIds)
            .in('category', disabledCategories);
          if (delScoresError) throw delScoresError;
        }
      }

      // 2. Prepare score upserts and track cleared scores for deletion
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

      const academicDeletes: { student_id: string; category: string }[] = [];
      const behaviorDeletes: string[] = [];

      for (const student of filteredStudents) {
        const studentId = student.id;
        const studentScores = scores[studentId] || {};
        const studentInitial = initialScores[studentId] || {};

        // Test score
        if (enabledCategories.test) {
          if (studentScores.test !== undefined && !isNaN(studentScores.test)) {
            const testScore = studentScores.test;
            if (testScore < 0 || testScore > testTotal) {
              throw new Error(`Test scores must be between 0 and ${testTotal}`);
            }
            academicUpserts.push({
              student_id: studentId,
              week,
              category: 'test',
              score: testScore,
              total: testTotal,
              term: CURRENT_TERM,
              year: CURRENT_YEAR,
            });
          } else if (studentInitial.test !== undefined && studentScores.test === undefined) {
            // Teacher explicitly cleared existing test score
            academicDeletes.push({ student_id: studentId, category: 'test' });
          }
        }

        // Classwork score
        if (enabledCategories.classwork) {
          if (studentScores.classwork !== undefined && !isNaN(studentScores.classwork)) {
            const classworkScore = studentScores.classwork;
            if (classworkScore < 0 || classworkScore > classworkTotal) {
              throw new Error(`Classwork scores must be between 0 and ${classworkTotal}`);
            }
            academicUpserts.push({
              student_id: studentId,
              week,
              category: 'classwork',
              score: classworkScore,
              total: classworkTotal,
              term: CURRENT_TERM,
              year: CURRENT_YEAR,
            });
          } else if (studentInitial.classwork !== undefined && studentScores.classwork === undefined) {
            // Teacher explicitly cleared existing classwork score
            academicDeletes.push({ student_id: studentId, category: 'classwork' });
          }
        }

        // Homework score
        if (enabledCategories.homework) {
          if (studentScores.homework !== undefined && !isNaN(studentScores.homework)) {
            const homeworkScore = studentScores.homework;
            if (homeworkScore < 0 || homeworkScore > homeworkTotal) {
              throw new Error(`Homework scores must be between 0 and ${homeworkTotal}`);
            }
            academicUpserts.push({
              student_id: studentId,
              week,
              category: 'homework',
              score: homeworkScore,
              total: homeworkTotal,
              term: CURRENT_TERM,
              year: CURRENT_YEAR,
            });
          } else if (studentInitial.homework !== undefined && studentScores.homework === undefined) {
            // Teacher explicitly cleared existing homework score
            academicDeletes.push({ student_id: studentId, category: 'homework' });
          }
        }

        // Behavior score
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
        } else if (studentInitial.behavior !== undefined && studentScores.behavior === undefined) {
          // Teacher explicitly cleared existing behavior score
          behaviorDeletes.push(studentId);
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

      // Delete cleared academic scores
      for (const del of academicDeletes) {
        const { error: delErr } = await supabase
          .from('academic_scores')
          .delete()
          .eq('term', CURRENT_TERM)
          .eq('year', CURRENT_YEAR)
          .eq('week', week)
          .eq('student_id', del.student_id)
          .eq('category', del.category);

        if (delErr) throw delErr;
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

      // Delete cleared behavior scores
      if (behaviorDeletes.length > 0) {
        const { error: delBehError } = await supabase
          .from('behavior_scores')
          .delete()
          .eq('term', CURRENT_TERM)
          .eq('year', CURRENT_YEAR)
          .eq('week', week)
          .in('student_id', behaviorDeletes);

        if (delBehError) throw delBehError;
      }

      setInitialScores(scores);
      setInitialCategories(enabledCategories);
      setSuccess(true);
      setHasUnsavedChanges(false);
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
      selectedGrade !== 'All' &&
      enabledCategories.test &&
      studentScore.test !== undefined &&
      (studentScore.test < 0 || studentScore.test > (totals.test ?? 0));

    const isClassworkExceeded =
      selectedGrade !== 'All' &&
      enabledCategories.classwork &&
      studentScore.classwork !== undefined &&
      (studentScore.classwork < 0 || studentScore.classwork > (totals.classwork ?? 0));

    const isHomeworkExceeded =
      selectedGrade !== 'All' &&
      enabledCategories.homework &&
      studentScore.homework !== undefined &&
      (studentScore.homework < 0 || studentScore.homework > (totals.homework ?? 0));

    const isBehaviorExceeded =
      selectedGrade !== 'All' &&
      studentScore.behavior !== undefined &&
      (studentScore.behavior < 0 || studentScore.behavior > 100);

    return (
      <tr key={student.id} className="hover:bg-[#18181e] transition-colors border-b border-[#1f1f27]">
        <td className="px-4 py-3 text-sm font-medium text-[#f0f0f2] whitespace-nowrap">
          {student.name}
          {selectedGrade === 'All' && (
            <span className="ml-2 font-mono text-xs text-[#55555f]">(G{student.grade})</span>
          )}
        </td>

        {/* Test Score */}
        {(selectedGrade === 'All' || enabledCategories.test) && (
          <td className="px-3 py-2.5 whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max={totals.test ?? undefined}
                placeholder="—"
                value={studentScore.test !== undefined ? studentScore.test : ''}
                onChange={(e) => handleScoreChange(student.id, 'test', e.target.value)}
                disabled={selectedGrade === 'All'}
                className={`w-20 px-2.5 py-1.5 rounded-sm font-mono text-sm placeholder-[#55555f] focus:outline-none transition-colors ${
                  isTestExceeded
                    ? 'border border-rose-500/80 bg-rose-950/20 text-rose-300'
                    : 'border border-[#2a2a35] bg-[#0c0c0e] text-[#f0f0f2] focus:border-amber-500/60'
                }`}
              />
              <span className="font-mono text-xs text-[#55555f]">
                / {selectedGrade === 'All' ? '—' : totals.test ?? '—'}
              </span>
            </div>
          </td>
        )}

        {/* Classwork Score */}
        {(selectedGrade === 'All' || enabledCategories.classwork) && (
          <td className="px-3 py-2.5 whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max={totals.classwork ?? undefined}
                placeholder="—"
                value={studentScore.classwork !== undefined ? studentScore.classwork : ''}
                onChange={(e) => handleScoreChange(student.id, 'classwork', e.target.value)}
                disabled={selectedGrade === 'All'}
                className={`w-20 px-2.5 py-1.5 rounded-sm font-mono text-sm placeholder-[#55555f] focus:outline-none transition-colors ${
                  isClassworkExceeded
                    ? 'border border-rose-500/80 bg-rose-950/20 text-rose-300'
                    : 'border border-[#2a2a35] bg-[#0c0c0e] text-[#f0f0f2] focus:border-amber-500/60'
                }`}
              />
              <span className="font-mono text-xs text-[#55555f]">
                / {selectedGrade === 'All' ? '—' : totals.classwork ?? '—'}
              </span>
            </div>
          </td>
        )}

        {/* Homework Score */}
        {(selectedGrade === 'All' || enabledCategories.homework) && (
          <td className="px-3 py-2.5 whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max={totals.homework ?? undefined}
                placeholder="—"
                value={studentScore.homework !== undefined ? studentScore.homework : ''}
                onChange={(e) => handleScoreChange(student.id, 'homework', e.target.value)}
                disabled={selectedGrade === 'All'}
                className={`w-20 px-2.5 py-1.5 rounded-sm font-mono text-sm placeholder-[#55555f] focus:outline-none transition-colors ${
                  isHomeworkExceeded
                    ? 'border border-rose-500/80 bg-rose-950/20 text-rose-300'
                    : 'border border-[#2a2a35] bg-[#0c0c0e] text-[#f0f0f2] focus:border-amber-500/60'
                }`}
              />
              <span className="font-mono text-xs text-[#55555f]">
                / {selectedGrade === 'All' ? '—' : totals.homework ?? '—'}
              </span>
            </div>
          </td>
        )}

        {/* Behavior Score */}
        <td className="px-3 py-2.5 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              max="100"
              placeholder="—"
              value={studentScore.behavior !== undefined ? studentScore.behavior : ''}
              onChange={(e) => handleScoreChange(student.id, 'behavior', e.target.value)}
              disabled={selectedGrade === 'All'}
              className={`w-20 px-2.5 py-1.5 rounded-sm font-mono text-sm placeholder-[#55555f] focus:outline-none transition-colors ${
                isBehaviorExceeded
                  ? 'border border-rose-500/80 bg-rose-950/20 text-rose-300'
                  : 'border border-[#2a2a35] bg-[#0c0c0e] text-[#f0f0f2] focus:border-amber-500/60'
              }`}
            />
            <span className="font-mono text-xs text-[#55555f]">/ 100</span>
          </div>
        </td>
      </tr>
    );
  };

  const renderTableHead = () => (
    <thead className="bg-[#0c0c0e] border-b border-[#1f1f27]">
      <tr>
        <th className="px-4 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8b8b9a]">
          Student
        </th>
        {(selectedGrade === 'All' || enabledCategories.test) && (
          <th className="px-3 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8b8b9a]">
            Test ({selectedGrade === 'All' ? '—' : totals.test ?? '—'})
          </th>
        )}
        {(selectedGrade === 'All' || enabledCategories.classwork) && (
          <th className="px-3 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8b8b9a]">
            Classwork ({selectedGrade === 'All' ? '—' : totals.classwork ?? '—'})
          </th>
        )}
        {(selectedGrade === 'All' || enabledCategories.homework) && (
          <th className="px-3 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8b8b9a]">
            Homework ({selectedGrade === 'All' ? '—' : totals.homework ?? '—'})
          </th>
        )}
        <th className="px-3 py-2.5 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8b8b9a]">
          Behavior (0–100)
        </th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6">
      {/* Top of Form: Week Dropdown & Grade Filter */}
      <div className="border border-[#1f1f27] bg-[#111115] rounded p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <label htmlFor="entry-week" className="block font-mono text-[11px] uppercase tracking-wider text-[#8b8b9a] mb-1.5">
              Competition Week
            </label>
            <select
              id="entry-week"
              value={week}
              onChange={(e) => handleWeekChange(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-[#f0f0f2] font-mono text-sm bg-[#0c0c0e] border border-[#2a2a35] rounded-sm focus:outline-none focus:border-amber-500/60 cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w} className="text-[#f0f0f2] bg-[#0c0c0e]">
                  Week {w}{weeksWithData.has(w) ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="entry-grade-filter" className="block font-mono text-[11px] uppercase tracking-wider text-[#8b8b9a] mb-1.5">
              Grade Cohort
            </label>
            <select
              id="entry-grade-filter"
              value={selectedGrade}
              onChange={(e) => handleGradeChange(e.target.value)}
              className="w-full px-3.5 py-2 text-[#f0f0f2] font-mono text-sm bg-[#0c0c0e] border border-[#2a2a35] rounded-sm focus:outline-none focus:border-amber-500/60 cursor-pointer"
            >
              <option value="All" className="text-[#f0f0f2] bg-[#0c0c0e]">
                All Grades
              </option>
              {GRADES.map((g) => (
                <option key={g} value={g} className="text-[#f0f0f2] bg-[#0c0c0e]">
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Week Progress Strip */}
        <div className="mt-5 pt-4 border-t border-[#1f1f27]">
          <label className="block font-mono text-[11px] uppercase tracking-wider text-[#55555f] mb-2.5">
            Week Navigation
          </label>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
              const hasData = weeksWithData.has(w);
              const isSelected = w === week;

              let pillStyle =
                'px-3 py-1.5 font-mono text-xs rounded-sm border transition-colors cursor-pointer flex items-center gap-1.5';
              if (isSelected) {
                pillStyle +=
                  ' bg-amber-400 text-black border-amber-400 font-semibold';
              } else if (hasData) {
                pillStyle += ' bg-[#18181e] text-[#f0f0f2] border-[#2a2a35] hover:border-[#3a3a48]';
              } else {
                pillStyle += ' bg-[#0c0c0e] text-[#8b8b9a] border-[#1f1f27] hover:text-[#f0f0f2] hover:border-[#2a2a35]';
              }

              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => handleWeekChange(w)}
                  className={pillStyle}
                >
                  <span>W{w}</span>
                  {hasData && <span className={isSelected ? 'text-black' : 'text-amber-400'}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Overwrite Warning Banner */}
        {weeksWithData.has(week) && (
          <div className="mt-4 border border-amber-500/30 bg-amber-950/20 rounded-sm p-3 font-mono text-xs text-amber-300 flex items-center gap-2">
            <span>[!]</span>
            <span>
              Week {week} already has data recorded{selectedGrade !== 'All' ? ` for Grade ${selectedGrade}` : ''}. Saving will update existing entries.
            </span>
          </div>
        )}
      </div>

      {/* Category Toggles & Totals Row */}
      <div className="border border-[#1f1f27] bg-[#111115] rounded p-5">
        <div className="text-sm font-semibold text-[#f0f0f2] mb-4 flex items-center justify-between">
          <span>Active Categories & Max Score Limits</span>
          <span className="font-mono text-xs text-[#55555f]">Week {week} assessment configuration</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Test Toggle & Total */}
          <div className="p-4 border border-[#1f1f27] bg-[#0c0c0e] rounded-sm">
            <label className="flex items-center gap-2.5 cursor-pointer font-medium text-sm text-[#f0f0f2] mb-3">
              <input
                type="checkbox"
                checked={enabledCategories.test}
                disabled={selectedGrade === 'All'}
                onChange={(e) => {
                  setEnabledCategories((prev) => ({ ...prev, test: e.target.checked }));
                  setHasUnsavedChanges(true);
                }}
                className="w-4 h-4 rounded-sm accent-amber-500 cursor-pointer"
              />
              <span>Test (50%)</span>
            </label>
            {selectedGrade === 'All' ? (
              <p className="font-mono text-xs text-[#55555f]">—</p>
            ) : enabledCategories.test ? (
              <div>
                <label htmlFor="total-test" className="block font-mono text-[11px] uppercase tracking-wider text-[#8b8b9a] mb-1">
                  Maximum Points
                </label>
                <input
                  id="total-test"
                  type="number"
                  min="1"
                  value={totals.test ?? ''}
                  onChange={(e) => {
                    setTotals((prev) => ({
                      ...prev,
                      test: e.target.value === '' ? null : Number(e.target.value),
                    }));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3 py-1.5 font-mono text-sm text-[#f0f0f2] bg-[#111115] border border-[#2a2a35] rounded-sm focus:outline-none focus:border-amber-500/60"
                />
              </div>
            ) : (
              <p className="font-mono text-xs text-[#55555f] italic">Disabled for Week {week}</p>
            )}
          </div>

          {/* Classwork Toggle & Total */}
          <div className="p-4 border border-[#1f1f27] bg-[#0c0c0e] rounded-sm">
            <label className="flex items-center gap-2.5 cursor-pointer font-medium text-sm text-[#f0f0f2] mb-3">
              <input
                type="checkbox"
                checked={enabledCategories.classwork}
                disabled={selectedGrade === 'All'}
                onChange={(e) => {
                  setEnabledCategories((prev) => ({ ...prev, classwork: e.target.checked }));
                  setHasUnsavedChanges(true);
                }}
                className="w-4 h-4 rounded-sm accent-amber-500 cursor-pointer"
              />
              <span>Classwork (30%)</span>
            </label>
            {selectedGrade === 'All' ? (
              <p className="font-mono text-xs text-[#55555f]">—</p>
            ) : enabledCategories.classwork ? (
              <div>
                <label htmlFor="total-classwork" className="block font-mono text-[11px] uppercase tracking-wider text-[#8b8b9a] mb-1">
                  Maximum Points
                </label>
                <input
                  id="total-classwork"
                  type="number"
                  min="1"
                  value={totals.classwork ?? ''}
                  onChange={(e) => {
                    setTotals((prev) => ({
                      ...prev,
                      classwork: e.target.value === '' ? null : Number(e.target.value),
                    }));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3 py-1.5 font-mono text-sm text-[#f0f0f2] bg-[#111115] border border-[#2a2a35] rounded-sm focus:outline-none focus:border-amber-500/60"
                />
              </div>
            ) : (
              <p className="font-mono text-xs text-[#55555f] italic">Disabled for Week {week}</p>
            )}
          </div>

          {/* Homework Toggle & Total */}
          <div className="p-4 border border-[#1f1f27] bg-[#0c0c0e] rounded-sm">
            <label className="flex items-center gap-2.5 cursor-pointer font-medium text-sm text-[#f0f0f2] mb-3">
              <input
                type="checkbox"
                checked={enabledCategories.homework}
                disabled={selectedGrade === 'All'}
                onChange={(e) => {
                  setEnabledCategories((prev) => ({ ...prev, homework: e.target.checked }));
                  setHasUnsavedChanges(true);
                }}
                className="w-4 h-4 rounded-sm accent-amber-500 cursor-pointer"
              />
              <span>Homework (20%)</span>
            </label>
            {selectedGrade === 'All' ? (
              <p className="font-mono text-xs text-[#55555f]">—</p>
            ) : enabledCategories.homework ? (
              <div>
                <label htmlFor="total-homework" className="block font-mono text-[11px] uppercase tracking-wider text-[#8b8b9a] mb-1">
                  Maximum Points
                </label>
                <input
                  id="total-homework"
                  type="number"
                  min="1"
                  value={totals.homework ?? ''}
                  onChange={(e) => {
                    setTotals((prev) => ({
                      ...prev,
                      homework: e.target.value === '' ? null : Number(e.target.value),
                    }));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3 py-1.5 font-mono text-sm text-[#f0f0f2] bg-[#111115] border border-[#2a2a35] rounded-sm focus:outline-none focus:border-amber-500/60"
                />
              </div>
            ) : (
              <p className="font-mono text-xs text-[#55555f] italic">Disabled for Week {week}</p>
            )}
          </div>
        </div>

        {selectedGrade === 'All' && (
          <p className="mt-4 font-mono text-xs text-amber-400">
            * Select a specific grade cohort above to configure assessment totals and enter scores.
          </p>
        )}
      </div>

      {/* Status Messages */}
      {success && (
        <div className="border border-emerald-500/30 bg-emerald-950/20 rounded-sm p-3.5 font-mono text-xs text-emerald-300 flex items-center gap-2">
          <span>✓</span>
          <span>Scores and week configuration saved successfully.</span>
        </div>
      )}
      {error && (
        <div className="border border-rose-500/30 bg-rose-950/20 rounded-sm p-3.5 font-mono text-xs text-rose-300">
          {error}
        </div>
      )}

      {loadingExisting && (
        <div className="font-mono text-xs text-[#8b8b9a]">
          Loading configuration and score data for Week {week}...
        </div>
      )}

      {/* Main Table */}
      {filteredStudents.length === 0 ? (
        <div className="border border-[#1f1f27] bg-[#111115] rounded p-8 text-center font-mono text-sm text-[#55555f]">
          No students found for {selectedGrade === 'All' ? 'the selected filter' : `Grade ${selectedGrade}`}.
        </div>
      ) : selectedGrade === 'All' ? (
        <div className="space-y-6">
          {GRADES.map((grade) => {
            const gradeStudents = studentsByGrade.get(grade) || [];
            if (gradeStudents.length === 0) return null;

            return (
              <div key={grade} className="border border-[#1f1f27] bg-[#111115] rounded overflow-hidden">
                <div className="bg-[#18181e] px-4 py-2.5 border-b border-[#1f1f27] flex items-center justify-between">
                  <h3 className="font-mono text-xs font-semibold text-[#f0f0f2] uppercase tracking-wider">
                    Grade {grade}
                  </h3>
                  <span className="font-mono text-xs text-[#55555f]">
                    {gradeStudents.length} {gradeStudents.length === 1 ? 'student' : 'students'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    {renderTableHead()}
                    <tbody className="divide-y divide-[#1f1f27]">
                      {gradeStudents.map(renderStudentRow)}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-[#1f1f27] bg-[#111115] rounded overflow-hidden">
          <div className="bg-[#18181e] px-4 py-2.5 border-b border-[#1f1f27] flex items-center justify-between">
            <h3 className="font-mono text-xs font-semibold text-[#f0f0f2] uppercase tracking-wider">
              Grade {selectedGrade} Roster
            </h3>
            <span className="font-mono text-xs text-[#55555f]">
              {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              {renderTableHead()}
              <tbody className="divide-y divide-[#1f1f27]">
                {filteredStudents.map(renderStudentRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2 flex items-center gap-4">
        <button
          onClick={validateAndSubmit}
          disabled={loading || loadingExisting || selectedGrade === 'All'}
          title={selectedGrade === 'All' ? 'Select a specific grade to save scores.' : undefined}
          className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? 'Saving Changes...' : 'Save All Scores'}
        </button>
        {hasUnsavedChanges && (
          <span className="font-mono text-xs text-amber-400 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Unsaved changes
          </span>
        )}
        {selectedGrade === 'All' && (
          <p className="font-mono text-xs text-[#55555f]">Select a specific grade above to enable saving.</p>
        )}
      </div>
    </div>
  );
}


