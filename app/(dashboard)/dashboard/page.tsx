import { createClient } from '@/lib/supabase/server';
import { CURRENT_TERM, CURRENT_YEAR, GRADES } from '@/lib/config';
import { processGradeData } from '@/lib/utils/processGradeData';
import { getPercentageColors } from '@/lib/utils/colors';

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

      {gradeSections.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No students found. Add students to view league tables.
        </div>
      ) : (
        gradeSections.map((section) => (
          <div key={section.grade} className="bg-white rounded-lg shadow overflow-hidden">
            {/* Grade Section Heading */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                Grade {section.grade} League Table
              </h3>
            </div>

            {/* Side-by-side Academic and Behavior Tables */}
            <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Academic Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                  <h4 className="text-base font-semibold text-gray-900">
                    Academic Performance
                  </h4>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Weighted %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {section.rankedAcademic.map((item) => {
                        const hasData = item.weeklyScores.some(
                          (w) => w.test !== undefined || w.classwork !== undefined || w.homework !== undefined
                        );
                        const { background, text } = getPercentageColors(item.weightedPercentage, hasData);
                        return (
                          <tr key={item.student.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-700">
                              {item.rank}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.student.name}
                            </td>
                            <td
                              className="px-4 py-3 whitespace-nowrap text-sm font-bold text-right"
                              style={{ backgroundColor: background, color: text }}
                            >
                              {hasData ? `${item.weightedPercentage.toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Behavior Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                  <h4 className="text-base font-semibold text-gray-900">
                    Behavior Performance
                  </h4>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Behavior Average
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {section.rankedBehavior.map((item) => {
                        const hasData = item.weeklyScores.length > 0;
                        const { background, text } = getPercentageColors(item.average, hasData);
                        return (
                          <tr key={item.student.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-700">
                              {item.rank}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.student.name}
                            </td>
                            <td
                              className="px-4 py-3 whitespace-nowrap text-sm font-bold text-right"
                              style={{ backgroundColor: background, color: text }}
                            >
                              {hasData ? `${item.average.toFixed(1)}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}