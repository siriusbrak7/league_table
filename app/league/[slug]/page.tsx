import { createClient } from '@/lib/supabase/server';
import { CURRENT_TERM, CURRENT_YEAR } from '@/lib/config';
import { processGradeData } from '@/lib/utils/processGradeData';
import { getPercentageColors } from '@/lib/utils/colors';
import { Trophy, Award, ShieldAlert } from 'lucide-react';
import type { AcademicScore, BehaviorScore, Student, WeekConfig } from '@/types';

interface LeagueData {
  grade: string;
  students: Student[];
  academic_scores: Pick<AcademicScore, 'student_id' | 'week' | 'category' | 'score' | 'total'>[];
  behavior_scores: Pick<BehaviorScore, 'student_id' | 'week' | 'score'>[];
  week_config: Pick<WeekConfig, 'week' | 'category' | 'total'>[];
}

interface PublicLeaguePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PublicLeaguePage({ params }: PublicLeaguePageProps) {
  const { slug } = await params;
  const match = /^grade-([7-9]|10|11)-([a-z0-9]{4})$/.exec(slug);

  if (!match) {
    return <InvalidLinkView />;
  }

  const [, requestedGrade, code] = match;
  const supabase = await createClient();

  // 1. Load the grade and all league data through the public RPC
  const { data, error } = await supabase.rpc('get_league_data_by_code', {
    p_grade: requestedGrade,
    p_code: code,
  });
  const leagueData = data as LeagueData | null;

  if (error || !leagueData) {
    return <InvalidLinkView />;
  }

  const { grade, students, academic_scores, behavior_scores, week_config } = leagueData;
  const weekConfigs = week_config.map((config) => ({ ...config, grade }));

  // 2. Process grade data
  const processedData = processGradeData(
    grade,
    students,
    academic_scores,
    behavior_scores,
    weekConfigs
  );

  const topAcademic = processedData.rankedAcademic.filter((s) => s.hasData).slice(0, 3);

  const getRankBadge = (rank: number | null, hasData: boolean) => {
    if (!hasData || rank === null) {
      return <span className="font-mono text-xs text-[var(--text-3)]">—</span>;
    }
    if (rank === 1) {
      return (
        <span className="rank-badge rank-1 font-mono text-xs font-bold inline-flex items-center gap-1">
          🥇 #1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="rank-badge rank-2 font-mono text-xs font-bold inline-flex items-center gap-1">
          🥈 #2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="rank-badge rank-3 font-mono text-xs font-bold inline-flex items-center gap-1">
          🥉 #3
        </span>
      );
    }
    return (
      <span className="font-mono text-xs font-semibold text-[var(--text-2)]">
        #{rank}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)] flex flex-col">
      {/* Header Banner */}
      <header className="sticky top-0 z-30 bg-[var(--surface)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-black text-black bg-[var(--gold)] px-2.5 py-1 rounded-md shadow-sm">
              GRADE {grade}
            </span>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-[var(--text-1)] tracking-tight">
                Physics League Championship
              </h1>
              <p className="eyebrow text-[var(--text-3)]">
                {CURRENT_TERM} · {CURRENT_YEAR} Official Standings
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-2)] w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-emerald-400 tracking-wider">LIVE STANDINGS</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-6 flex-1 w-full space-y-7">
        {students.length === 0 ? (
          <div className="border border-[var(--border)] bg-[var(--surface)] rounded-xl p-12 text-center text-[var(--text-3)]">
            No students found for Grade {grade}.
          </div>
        ) : (
          <>
            {/* Top 3 Podium Highlights */}
            {topAcademic.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {topAcademic.map((item, idx) => {
                  const placeLabels = ['Championship Leader', 'Second Place', 'Third Place'];
                  const medalIcons = ['🥇', '🥈', '🥉'];
                  const borderClasses = [
                    'border-[var(--gold)]/60 bg-[var(--gold-dim)]/40',
                    'border-slate-400/40 bg-[var(--surface-2)]',
                    'border-amber-700/40 bg-[var(--surface-2)]',
                  ];

                  return (
                    <div
                      key={item.student.id}
                      className={`p-5 rounded-xl border flex items-center justify-between shadow-sm ${borderClasses[idx] || 'border-[var(--border)] bg-[var(--surface)]'}`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="text-2xl">{medalIcons[idx]}</span>
                        <div>
                          <div className="eyebrow text-[var(--gold)] font-bold">
                            {placeLabels[idx]}
                          </div>
                          <div className="text-base font-bold text-[var(--text-1)] mt-0.5">
                            {item.student.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="eyebrow block">Mastery</span>
                        <span className="font-mono text-lg font-black text-[var(--gold)]">
                          {item.weightedPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Academic Performance Table */}
              <div className="border border-[var(--border)] bg-[var(--surface)] rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="bg-[var(--surface-2)]/70 px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
                  <h2 className="eyebrow text-[var(--gold)] flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-[var(--gold)]" />
                    Academic Mastery Standings
                  </h2>
                  <span className="eyebrow text-[var(--text-3)]">
                    Weighted 50 / 30 / 20
                  </span>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[var(--surface-2)] border-b border-[var(--border)] text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
                        <th className="px-5 py-3 w-20">Rank</th>
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3 text-right w-32">Mastery</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {processedData.rankedAcademic.map((item) => {
                        const { background, text } = getPercentageColors(
                          item.weightedPercentage,
                          item.hasData
                        );

                        return (
                          <tr key={item.student.id} className="hover:bg-[var(--surface-2)]/50 transition-colors">
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {getRankBadge(item.rank, item.hasData)}
                            </td>
                            <td className="px-5 py-3.5 text-sm font-semibold text-[var(--text-1)]">
                              {item.student.name}
                            </td>
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <span
                                className="inline-block px-2.5 py-0.5 rounded-md font-mono text-xs font-bold"
                                style={{ backgroundColor: background, color: text }}
                              >
                                {item.hasData ? `${item.weightedPercentage.toFixed(1)}%` : '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Behavior Performance Table */}
              <div className="border border-[var(--border)] bg-[var(--surface)] rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="bg-[var(--surface-2)]/70 px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
                  <h2 className="eyebrow text-[var(--text-2)] flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-[var(--text-2)]" />
                    Conduct & Behavior Standings
                  </h2>
                  <span className="eyebrow text-[var(--text-3)]">
                    Average %
                  </span>
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[var(--surface-2)] border-b border-[var(--border)] text-[11px] font-semibold text-[var(--text-3)] uppercase tracking-wider">
                        <th className="px-5 py-3 w-20">Rank</th>
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3 text-right w-32">Conduct</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {processedData.rankedBehavior.map((item) => {
                        const { background, text } = getPercentageColors(
                          item.average,
                          item.hasData
                        );

                        return (
                          <tr key={item.student.id} className="hover:bg-[var(--surface-2)]/50 transition-colors">
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {getRankBadge(item.rank, item.hasData)}
                            </td>
                            <td className="px-5 py-3.5 text-sm font-semibold text-[var(--text-1)]">
                              {item.student.name}
                            </td>
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <span
                                className="inline-block px-2.5 py-0.5 rounded-md font-mono text-xs font-bold"
                                style={{ backgroundColor: background, color: text }}
                              >
                                {item.hasData ? `${item.average.toFixed(1)}%` : '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-5 px-4 text-center text-xs text-[var(--text-3)]">
        Physics League &bull; Official Student Standings
      </footer>
    </div>
  );
}

function InvalidLinkView() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 text-[var(--text-1)]">
      <div className="border border-[var(--border)] bg-[var(--surface)] rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-[var(--text-1)] mb-2">Access Denied or Expired</h1>
        <p className="text-xs text-[var(--text-2)] mb-6 leading-relaxed">
          This league table link is invalid or has been updated by your teacher. Please request the current link from your teacher.
        </p>
        <div className="eyebrow text-[var(--text-3)] border-t border-[var(--border)] pt-4">
          Physics League Championship
        </div>
      </div>
    </div>
  );
}
