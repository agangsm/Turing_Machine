import type { Digits, Game } from './turing.ts';
import { generateGame, type PuzzleWithCards } from './generator.ts';

export type MasterMode = 'formal' | 'practice';
export type MasterStatus = 'playing' | 'resting' | 'failed' | 'completed';

export type MasterAnswer = { index: number; pass: boolean };
export type MasterRoundRecord = { round: number; guess: Digits; answers: MasterAnswer[] };
export type DeductionMarks = [number[], number[], number[]];

export type MasterQuestion = {
  game: Game;
  difficulty: 0 | 1 | 2;
  activeMs: number;
  activeStartedAt: number | null;
  questions: number;
  guesses: string[];
  guessUses: Record<string, number>;
  history: MasterRoundRecord[];
  submissions: number;
  verifierUses: Record<string, number>;
  deductionMarks: DeductionMarks;
  scratch: string;
  completed: boolean;
};

export type MasterRun = {
  dateKey: string;
  mode: MasterMode;
  status: MasterStatus;
  index: number;
  questions: MasterQuestion[];
  restEndsAt: number | null;
  startedAt: number;
  failedAt: number | null;
  completedAt: number | null;
};

export const MASTER_LIMIT_MS = 60 * 60 * 1000;
export const MASTER_REST_MS = 2 * 60 * 1000;

export function chinaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const masterDifficulty: Array<0 | 1 | 2> = [0, 0, 1, 1, 1, 1, 2, 2, 2, 2];

export function createDailyMasterRun(dateKey: string, mode: MasterMode, bank: PuzzleWithCards[], now = Date.now()): MasterRun {
  const questions = masterDifficulty.map((difficulty, index) => {
    const n = difficulty + 4;
    const game = generateGame(n, difficulty, bank, `MASTER-${dateKey}-${index + 1}-${n}-${difficulty}`);
    return { game, difficulty, activeMs: 0, activeStartedAt: index === 0 ? now : null, questions: 0, guesses: [], guessUses: {}, history: [], submissions: 0, verifierUses: {}, deductionMarks: [[], [], []], scratch: '', completed: false };
  });
  return { dateKey, mode, status: 'playing', index: 0, questions, restEndsAt: null, startedAt: now, failedAt: null, completedAt: null };
}

export function questionElapsed(question: MasterQuestion, now = Date.now()) {
  return question.activeMs + (question.activeStartedAt ? Math.max(0, now - question.activeStartedAt) : 0);
}

export function runElapsed(run: MasterRun, now = Date.now()) {
  return run.questions.reduce((total, question) => total + questionElapsed(question, now), 0);
}

export function remainingMs(run: MasterRun, now = Date.now()) {
  return Math.max(0, MASTER_LIMIT_MS - runElapsed(run, now));
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export function difficultyLabel(level: number) {
  return ['入门', '标准', '困难'][level] ?? '未知';
}
