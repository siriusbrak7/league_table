import { StudentAcademicData, StudentBehaviorData } from '@/types';

// Calculate weighted percentage for a single week
export function calculateWeeklyPercentage(
  configuredCategories: { test?: boolean; classwork?: boolean; homework?: boolean },
  test?: { score: number; total: number },
  classwork?: { score: number; total: number },
  homework?: { score: number; total: number }
): number | null {
  const testWeight = configuredCategories.test ? 0.5 : 0;
  const classworkWeight = configuredCategories.classwork ? 0.3 : 0;
  const homeworkWeight = configuredCategories.homework ? 0.2 : 0;
  const totalWeight = testWeight + classworkWeight + homeworkWeight;

  if (totalWeight === 0) {
    return null;
  }

  const testPercent = test?.total && test.total > 0 ? (test.score / test.total) * 100 : 0;
  const classworkPercent =
    classwork?.total && classwork.total > 0 ? (classwork.score / classwork.total) * 100 : 0;
  const homeworkPercent =
    homework?.total && homework.total > 0 ? (homework.score / homework.total) * 100 : 0;

  return (
    (testPercent * testWeight + classworkPercent * classworkWeight + homeworkPercent * homeworkWeight) /
    totalWeight
  );
}

// Calculate overall weighted percentage for a student across all weeks
export function calculateOverallPercentage(
  weeklyScores: {
    week: number;
    configuredCategories: { test?: boolean; classwork?: boolean; homework?: boolean };
    test?: { score: number; total: number };
    classwork?: { score: number; total: number };
    homework?: { score: number; total: number };
  }[]
): number {
  const weeklyPercentages: number[] = [];

  for (const week of weeklyScores) {
    const weeklyPercent = calculateWeeklyPercentage(
      week.configuredCategories,
      week.test,
      week.classwork,
      week.homework
    );
    if (weeklyPercent !== null) {
      weeklyPercentages.push(weeklyPercent);
    }
  }

  if (weeklyPercentages.length === 0) {
    return 0;
  }

  // Average of all weekly percentages with academic data
  const sum = weeklyPercentages.reduce((acc, curr) => acc + curr, 0);
  return sum / weeklyPercentages.length;
}

// Calculate behavior average
export function calculateBehaviorAverage(
  weeklyScores: {
    week: number;
    score: number;
  }[]
): number {
  if (weeklyScores.length === 0) {
    return 0;
  }

  const sum = weeklyScores.reduce((acc, curr) => acc + curr.score, 0);
  return sum / weeklyScores.length;
}

// Calculate academic ranks with standard competition tie handling (1, 1, 3...)
// Students without data are excluded from numeric ranking (rank = null) and sorted to the bottom.
export function calculateAcademicRanks(
  students: StudentAcademicData[]
): StudentAcademicData[] {
  const withData = students.filter((s) => s.hasData);
  const withoutData = students.filter((s) => !s.hasData);

  const sortedWithData = [...withData].sort((a, b) => b.weightedPercentage - a.weightedPercentage);

  let currentRank = 1;
  const rankedWithData = sortedWithData.map((student, index) => {
    if (index > 0 && Math.abs(student.weightedPercentage - sortedWithData[index - 1].weightedPercentage) < 0.001) {
      // Tied with previous student
      return {
        ...student,
        rank: currentRank,
      };
    }
    currentRank = index + 1;
    return {
      ...student,
      rank: currentRank,
    };
  });

  const unrankedWithoutData = withoutData.map((student) => ({
    ...student,
    rank: null,
  }));

  return [...rankedWithData, ...unrankedWithoutData];
}

// Calculate behavior ranks with standard competition tie handling (1, 1, 3...)
// Students without data are excluded from numeric ranking (rank = null) and sorted to the bottom.
export function calculateBehaviorRanks(
  students: StudentBehaviorData[]
): StudentBehaviorData[] {
  const withData = students.filter((s) => s.hasData);
  const withoutData = students.filter((s) => !s.hasData);

  const sortedWithData = [...withData].sort((a, b) => b.average - a.average);

  let currentRank = 1;
  const rankedWithData = sortedWithData.map((student, index) => {
    if (index > 0 && Math.abs(student.average - sortedWithData[index - 1].average) < 0.001) {
      // Tied with previous student
      return {
        ...student,
        rank: currentRank,
      };
    }
    currentRank = index + 1;
    return {
      ...student,
      rank: currentRank,
    };
  });

  const unrankedWithoutData = withoutData.map((student) => ({
    ...student,
    rank: null,
  }));

  return [...rankedWithData, ...unrankedWithoutData];
}