import {
  calculateOverallPercentage,
  calculateBehaviorAverage,
  calculateAcademicRanks,
  calculateBehaviorRanks,
} from './calculations';
import type { Student, AcademicScore, BehaviorScore, StudentAcademicData, StudentBehaviorData } from '@/types';

export interface GradeProcessedData {
  grade: string;
  students: Student[];
  rankedAcademic: StudentAcademicData[];
  rankedBehavior: StudentBehaviorData[];
  academicRanks: Record<string, number>;
  behaviorRanks: Record<string, number>;
  overallPercentages: Array<{
    studentId: string;
    academic: number;
    behavior: number;
    hasAcademicData: boolean;
    hasBehaviorData: boolean;
  }>;
}

/**
 * Processes all academic and behavior data for a single grade's students.
 * Calculates per-grade rankings (not cross-grade).
 * Returns everything needed by both the dashboard page and print page.
 */
export function processGradeData(
  grade: string,
  gradeStudents: Student[],
  academicScores: AcademicScore[],
  behaviorScores: BehaviorScore[]
): GradeProcessedData {
  // --- Academic data ---
  const academicData: StudentAcademicData[] = gradeStudents.map((student) => {
    const studentScores = academicScores.filter((s) => s.student_id === student.id);

    const weeklyScores = [];
    for (let week = 1; week <= 12; week++) {
      const weekScores = studentScores.filter((s) => s.week === week);
      const test = weekScores.find((s) => s.category === 'test');
      const classwork = weekScores.find((s) => s.category === 'classwork');
      const homework = weekScores.find((s) => s.category === 'homework');

      weeklyScores.push({
        week,
        test: test ? { score: test.score, total: test.total } : undefined,
        classwork: classwork ? { score: classwork.score, total: classwork.total } : undefined,
        homework: homework ? { score: homework.score, total: homework.total } : undefined,
      });
    }

    return {
      student,
      weeklyScores,
      weightedPercentage: calculateOverallPercentage(weeklyScores),
      rank: 0,
    };
  });

  const rankedAcademic = calculateAcademicRanks(academicData);
  const academicRanks: Record<string, number> = {};
  rankedAcademic.forEach((item) => {
    academicRanks[item.student.id] = item.rank;
  });

  // --- Behavior data ---
  const behaviorData: StudentBehaviorData[] = gradeStudents.map((student) => {
    const studentScores = behaviorScores.filter((s) => s.student_id === student.id);
    const weeklyScores = studentScores.map((s) => ({ week: s.week, score: s.score }));

    return {
      student,
      weeklyScores,
      average: calculateBehaviorAverage(weeklyScores),
      rank: 0,
    };
  });

  const rankedBehavior = calculateBehaviorRanks(behaviorData);
  const behaviorRanks: Record<string, number> = {};
  rankedBehavior.forEach((item) => {
    behaviorRanks[item.student.id] = item.rank;
  });

  // --- Combined percentages with data-presence flags ---
  const overallPercentages = gradeStudents.map((student) => {
    const acData = academicData.find((a) => a.student.id === student.id)!;
    const bhData = behaviorData.find((b) => b.student.id === student.id)!;

    const hasAcademicData = acData.weeklyScores.some(
      (w) => w.test !== undefined || w.classwork !== undefined || w.homework !== undefined
    );
    const hasBehaviorData = bhData.weeklyScores.length > 0;

    return {
      studentId: student.id,
      academic: acData.weightedPercentage,
      behavior: bhData.average,
      hasAcademicData,
      hasBehaviorData,
    };
  });

  return {
    grade,
    students: gradeStudents,
    rankedAcademic,
    rankedBehavior,
    academicRanks,
    behaviorRanks,
    overallPercentages,
  };
}
