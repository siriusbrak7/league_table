import { StudentAcademicData, StudentBehaviorData } from '@/types';

// Calculate weighted percentage for a single week
export function calculateWeeklyPercentage(
  test?: { score: number; total: number },
  classwork?: { score: number; total: number },
  homework?: { score: number; total: number }
): number | null {
  // If no scores for this week, return null
  if (!test && !classwork && !homework) {
    return null;
  }

  let testPercent = 0;
  let classworkPercent = 0;
  let homeworkPercent = 0;
  let hasTest = false;
  let hasClasswork = false;
  let hasHomework = false;

  if (test && test.total > 0) {
    testPercent = (test.score / test.total) * 100;
    hasTest = true;
  }

  if (classwork && classwork.total > 0) {
    classworkPercent = (classwork.score / classwork.total) * 100;
    hasClasswork = true;
  }

  if (homework && homework.total > 0) {
    homeworkPercent = (homework.score / homework.total) * 100;
    hasHomework = true;
  }

  // Apply weights (50% test, 30% classwork, 20% homework)
  // Only apply weights for categories that have data
  let weightedSum = 0;
  let totalWeight = 0;

  if (hasTest) {
    weightedSum += testPercent * 0.50;
    totalWeight += 0.50;
  }

  if (hasClasswork) {
    weightedSum += classworkPercent * 0.30;
    totalWeight += 0.30;
  }

  if (hasHomework) {
    weightedSum += homeworkPercent * 0.20;
    totalWeight += 0.20;
  }

  // If no weights were applied, return null
  if (totalWeight === 0) {
    return null;
  }

  // Normalize by total weight applied
  return (weightedSum / totalWeight);
}

// Calculate overall weighted percentage for a student across all weeks
export function calculateOverallPercentage(
  weeklyScores: {
    week: number;
    test?: { score: number; total: number };
    classwork?: { score: number; total: number };
    homework?: { score: number; total: number };
  }[]
): number {
  const weeklyPercentages: number[] = [];

  for (const week of weeklyScores) {
    const weeklyPercent = calculateWeeklyPercentage(week.test, week.classwork, week.homework);
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