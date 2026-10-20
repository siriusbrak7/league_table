'use client';

import { useState } from 'react';
import type { GradeProcessedData } from '@/lib/utils/processGradeData';
import type { Student } from '@/types';
import StudentDetailModal from './student-detail-modal';

interface DashboardTablesProps {
  gradeSections: GradeProcessedData[];
}

export default function DashboardTables({ gradeSections }: DashboardTablesProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string>('All');

  if (gradeSections.length === 0) {
    return (
      <div className="card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
        <p style={{ fontSize: '0.85rem' }}>No standings yet. Add students and enter scores to generate tables.</p>
      </div>
    );
  }

  const filteredSections =
    selectedGrade === 'All'
      ? gradeSections
      : gradeSections.filter((s) => String(s.grade) === selectedGrade);

  const getRankLabel = (rank: number | null, hasData: boolean) => {
    if (!hasData || rank === null) {
      return <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-geist-mono)', fontSize: '0.8rem' }}>—</span>;
    }
    if (rank === 1) return <span className="rank-gold"   style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.82rem', fontWeight: 800 }}>🥇 {rank}</span>;
    if (rank === 2) return <span className="rank-silver" style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.82rem', fontWeight: 800 }}>🥈 {rank}</span>;
    if (rank === 3) return <span className="rank-bronze" style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.82rem', fontWeight: 800 }}>🥉 {rank}</span>;
    return <span style={{ color: 'var(--text-2)', fontFamily: 'var(--font-geist-mono)', fontSize: '0.82rem', fontWeight: 600 }}>{rank}</span>;
  };

  const getScoreStyle = (score: number, hasData: boolean) => {
    if (!hasData) return { background: '#e7e6e0', color: '#737a7d' };
    if (score >= 90) return { background: '#d8eddf', color: '#17643a' };
    if (score >= 80) return { background: '#e1ebd8', color: '#49642d' };
    if (score >= 70) return { background: '#f0e5b9', color: '#745c12' };
    if (score >= 60) return { background: '#f3d5b5', color: '#854619' };
    return { background: '#efd0cc', color: '#8e302b' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Grade filter tab bar */}
      <div className="tab-bar">
        {['All', ...gradeSections.map((s) => String(s.grade))].map((grade) => (
          <button
            key={grade}
            onClick={() => setSelectedGrade(grade)}
            className={`tab-btn${selectedGrade === grade ? ' active' : ''}`}
          >
            {grade === 'All' ? `All (${gradeSections.length})` : `Gr. ${grade}`}
          </button>
        ))}
      </div>

      {/* Grade sections */}
      {filteredSections.map((section) => (
        <div key={section.grade} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Section heading */}
          <div className="section-rule">
            <h2>Grade {section.grade}</h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--font-geist-mono)', whiteSpace: 'nowrap' }}>
              {section.rankedAcademic.length} students
            </span>
          </div>

          {/* Side-by-side tables */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>

            {/* Academic Mastery */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-header">
                <span className="card-header-title">Academic Mastery</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Weighted %
                </span>
              </div>
              <table className="league-table">
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'left', paddingLeft: 14 }}>#</th>
                    <th style={{ textAlign: 'left', paddingLeft: 14 }}>Name</th>
                    <th style={{ textAlign: 'right', paddingRight: 14, width: 80 }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rankedAcademic.map((item) => {
                    const scoreStyle = getScoreStyle(item.weightedPercentage, item.hasData);
                    return (
                      <tr
                        key={item.student.id}
                        className={item.rank === 1 ? 'podium-first' : item.rank === 2 ? 'podium-second' : item.rank === 3 ? 'podium-third' : ''}
                        onClick={() => setSelectedStudent(item.student)}
                      >
                        <td style={{ paddingLeft: 14, paddingTop: 10, paddingBottom: 10 }}>
                          {getRankLabel(item.rank, item.hasData)}
                        </td>
                        <td style={{ paddingLeft: 14, paddingTop: 10, paddingBottom: 10, fontSize: '0.85rem', color: 'var(--text-1)', fontWeight: 500 }}>
                          {item.student.name}
                        </td>
                        <td style={{ paddingRight: 14, textAlign: 'right' }}>
                          <span
                            className="score-pill"
                            style={{ backgroundColor: scoreStyle.background, color: scoreStyle.color }}
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

            {/* Conduct */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-header">
                <span className="card-header-title">Conduct</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Average %
                </span>
              </div>
              <table className="league-table">
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'left', paddingLeft: 14 }}>#</th>
                    <th style={{ textAlign: 'left', paddingLeft: 14 }}>Name</th>
                    <th style={{ textAlign: 'right', paddingRight: 14, width: 80 }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rankedBehavior.map((item) => {
                    const scoreStyle = getScoreStyle(item.average, item.hasData);
                    return (
                      <tr
                        key={item.student.id}
                        className={item.rank === 1 ? 'podium-first' : item.rank === 2 ? 'podium-second' : item.rank === 3 ? 'podium-third' : ''}
                        onClick={() => setSelectedStudent(item.student)}
                      >
                        <td style={{ paddingLeft: 14, paddingTop: 10, paddingBottom: 10 }}>
                          {getRankLabel(item.rank, item.hasData)}
                        </td>
                        <td style={{ paddingLeft: 14, paddingTop: 10, paddingBottom: 10, fontSize: '0.85rem', color: 'var(--text-1)', fontWeight: 500 }}>
                          {item.student.name}
                        </td>
                        <td style={{ paddingRight: 14, textAlign: 'right' }}>
                          <span
                            className="score-pill"
                            style={{ backgroundColor: scoreStyle.background, color: scoreStyle.color }}
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
      ))}

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
