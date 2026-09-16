import { createClient } from '@/lib/supabase/server';
import { CURRENT_TERM, CURRENT_YEAR, GRADES } from '@/lib/config';
import { processGradeData } from '@/lib/utils/processGradeData';
import DashboardTables from '@/components/dashboard/dashboard-tables';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch students
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .order('grade')
    .order('name');

  // Fetch academic scores
  const { data: academicScores, error: academicError } = await supabase
    .from('academic_scores')
    .select('*')
    .eq('term', CURRENT_TERM)
    .eq('year', CURRENT_YEAR);

  // Fetch behavior scores
  const { data: behaviorScores, error: behaviorError } = await supabase
    .from('behavior_scores')
    .select('*')
    .eq('term', CURRENT_TERM)
    .eq('year', CURRENT_YEAR);

  // Surface any fetch errors visibly instead of rendering a blank table
  const fetchError = studentsError ?? academicError ?? behaviorError;
  if (fetchError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Failed to load data</h2>
        <p className="text-red-700 text-sm">{fetchError.message}</p>
        <p className="text-red-600 text-xs mt-2">
          Check your Supabase connection and try refreshing the page.
        </p>
      </div>
    );
  }

  // Process data per grade level using the shared utility
  const gradeSections = GRADES
    .map((grade) => {
      const gradeStudents = (students ?? []).filter(
        (student) => String(student.grade) === grade
      );
      if (gradeStudents.length === 0) return null;
      return processGradeData(grade, gradeStudents, academicScores ?? [], behaviorScores ?? []);
    })
    .filter((section): section is NonNullable<typeof section> => section !== null);

  return (
    <div className="space-y-10">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {CURRENT_TERM} {CURRENT_YEAR} - Live Standings
        </h2>
        <p className="text-gray-600">
          Weekly progress: Week 1-12 (update as you enter scores)
        </p>
      </div>

      <DashboardTables gradeSections={gradeSections} />
    </div>
  );
}