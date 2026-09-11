// Shared constants — update here when the term or year changes.
// This file is the single source of truth used by dashboard, print, and entry pages.

export const CURRENT_TERM = 'Term 1';
export const CURRENT_YEAR = 2026;

export const GRADES = ['7', '8', '9', '10', '11'] as const;
export type Grade = (typeof GRADES)[number];
