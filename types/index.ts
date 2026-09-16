export interface Student {
  id: string;
  name: string;
  grade: string;
}

export interface AcademicScore {
  id: string;
  student_id: string;
  term: string;
  year: number;
  week: number;
  category: 'test' | 'classwork' | 'homework';
  score: number;
  total: number;
}

export interface BehaviorScore {
  id: string;
  student_id: string;
  term: string;
  year: number;
  week: number;
  score: number;
}

export interface TermSummary {
  id: string;
  student_id: string;
  term: string;
  year: number;
  academic_percentage: number;
  academic_rank: number;
  behavior_percentage: number;
  behavior_rank: number;
}

export interface StudentAcademicData {
  student: Student;
  weeklyScores: {
    week: number;
    test?: { score: number; total: number };
    classwork?: { score: number; total: number };
    homework?: { score: number; total: number };
  }[];
  weightedPercentage: number;
  rank: number | null;
  hasData: boolean;
}

export interface StudentBehaviorData {
  student: Student;
  weeklyScores: {
    week: number;
    score: number;
  }[];
  average: number;
  rank: number | null;
  hasData: boolean;
}

export interface WeekConfig {
  id: string;
  term: string;
  year: number;
  week: number;
  category: 'test' | 'classwork' | 'homework';
  total: number;
  created_at?: string;
  updated_at?: string;
}

export interface GradeToken {
  id: string;
  grade: string;
  token: string;
  created_at: string;
  updated_at: string;
}