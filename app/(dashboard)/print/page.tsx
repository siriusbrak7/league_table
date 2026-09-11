import { createClient } from '@/lib/supabase/server';
import { CURRENT_TERM, CURRENT_YEAR, GRADES } from '@/lib/config';
import { processGradeData } from '@/lib/utils/processGradeData';
import PrintView from '@/components/dashboard/print-view';

export default async function PrintPage() {
  const supabase = await createClient();

  // Fetch all data in parallel, scoped to current term and year
  const [studentsRes, academicRes, behaviorRes] = await Promise.all([
    supabase
      .from('students')
      .select('*')
      .order('grade')
      .order('name'),
    supabase
      .from('academic_scores')
      .select('*')
      .eq('term', CURRENT_TERM)
      .eq('year', CURRENT_YEAR),
    supabase
      .from('behavior_scores')
      .select('*')
      .eq('term', CURRENT_TERM)
      .eq('year', CURRENT_YEAR),
  ]);

  // Surface any fetch errors visibly instead of rendering blank tables
  const fetchError = studentsRes.error ?? academicRes.error ?? behaviorRes.error;
  if (fetchError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Failed to load data</h2>
          <p className="text-red-700 text-sm">{fetchError.message}</p>
          <p className="text-red-600 text-xs mt-2">
            Check your Supabase connection and try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  const students = studentsRes.data ?? [];
  const academicScores = academicRes.data ?? [];
  const behaviorScores = behaviorRes.data ?? [];

  // Process data per grade level using the shared utility
  const gradeSections = GRADES
    .map((grade) => {
      const gradeStudents = students.filter((s) => String(s.grade) === grade);
      if (gradeStudents.length === 0) return null;
      return processGradeData(grade, gradeStudents, academicScores, behaviorScores);
    })
    .filter((section): section is NonNullable<typeof section> => section !== null);

  return <PrintView gradeSections={gradeSections} />;
}
