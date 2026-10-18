import { createClient } from '@/lib/supabase/server';
import { CURRENT_TERM, CURRENT_YEAR, GRADES } from '@/lib/config';
import { processGradeData } from '@/lib/utils/processGradeData';
import DashboardTables from '@/components/dashboard/dashboard-tables';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: students, error: studentsError } = await supabase
    .from('students').select('*').order('grade').order('name');

  const { data: academicScores, error: academicError } = await supabase
    .from('academic_scores').select('*')
    .eq('term', CURRENT_TERM).eq('year', CURRENT_YEAR);

  const { data: behaviorScores, error: behaviorError } = await supabase
    .from('behavior_scores').select('*')
    .eq('term', CURRENT_TERM).eq('year', CURRENT_YEAR);

  const { data: weekConfigs, error: weekConfigError } = await supabase
    .from('week_config').select('*')
    .eq('term', CURRENT_TERM).eq('year', CURRENT_YEAR);

  const fetchError = studentsError ?? academicError ?? behaviorError ?? weekConfigError;
  if (fetchError) {
    return (
      <div className="alert-error" style={{ marginTop: 24 }}>
        <strong>Failed to load data</strong>
        <br />
        <span style={{ opacity: 0.8, fontSize: '0.75rem' }}>{fetchError.message}</span>
      </div>
    );
  }

  const gradeSections = GRADES
    .map((grade) => {
      const gradeStudents = (students ?? []).filter(
        (s) => String(s.grade) === grade
      );
      if (gradeStudents.length === 0) return null;
      return processGradeData(
        grade,
        gradeStudents,
        academicScores ?? [],
        behaviorScores ?? [],
        weekConfigs ?? []
      );
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const totalStudents   = students?.length ?? 0;
  const activeCohorts   = gradeSections.length;
  const recordedWeeks   = new Set(
    (academicScores ?? []).map((s) => s.week).concat((behaviorScores ?? []).map((s) => s.week))
  ).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Page header */}
      <div className="page-header">
        <p className="eyebrow" style={{ marginBottom: 6 }}>{CURRENT_TERM} · {CURRENT_YEAR}</p>
        <h1 className="page-title">League Standings</h1>
        <p className="page-subtitle">
          Academic mastery and conduct rankings across all grade cohorts.
        </p>
      </div>

      {/* KPI strip */}
      <div className="stat-strip" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="stat-cell">
          <div className="stat-label">Students</div>
          <div className="stat-value" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-geist-mono)' }}>
            {totalStudents}
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-label">Cohorts</div>
          <div className="stat-value" style={{ color: 'var(--gold)', fontFamily: 'var(--font-geist-mono)' }}>
            {activeCohorts}
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-label">Weeks logged</div>
          <div className="stat-value" style={{ color: 'var(--text-1)', fontFamily: 'var(--font-geist-mono)' }}>
            {recordedWeeks}
            <span style={{ fontSize: '0.9rem', color: 'var(--text-3)', fontWeight: 600 }}>/12</span>
          </div>
        </div>
      </div>

      <DashboardTables gradeSections={gradeSections} />
    </div>
  );
}
