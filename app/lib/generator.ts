import { evaluateLaw, initialGame } from './turing.ts';
import type { Digits, Game } from './turing.ts';

export type PuzzleWithCards = Game & { page?: number; position?: number };

export const allCodes: Digits[] = Array.from({ length: 125 }, (_, index) => [
  Math.floor(index / 25) + 1,
  Math.floor((index % 25) / 5) + 1,
  (index % 5) + 1,
] as Digits);

const fullMask = (1n << 125n) - 1n;
const lawMaskCache = new Map<number, bigint>();
const lawMask = (law: number) => {
  const cached = lawMaskCache.get(law);
  if (cached !== undefined) return cached;
  const mask = allCodes.reduce((result, code, index) => evaluateLaw(law, code) ? result | (1n << BigInt(index)) : result, 0n);
  lawMaskCache.set(law, mask);
  return mask;
};
const solutionMask = (laws: number[]) => laws.reduce((mask, law) => mask & lawMask(law), fullMask);
const hasMoreThanOne = (mask: bigint) => mask !== 0n && (mask & (mask - 1n)) !== 0n;

export function analyzeGame(game: Game) {
  const mask = solutionMask(game.law);
  const solutions = allCodes.filter((_, index) => (mask & (1n << BigInt(index))) !== 0n);
  const expected = String(game.code).padStart(3, '0').split('').map(Number) as Digits;
  const expectedPasses = game.law.every((law) => evaluateLaw(law, expected));
  const unique = solutions.length === 1 && Number(solutions[0].join('')) === game.code;
  const everyOtherCodeFails = unique && expectedPasses;
  const indispensable = game.law.every((_, omitted) => hasMoreThanOne(solutionMask(game.law.filter((__, index) => index !== omitted))));
  return { solutions, expected, expectedPasses, everyOtherCodeFails, indispensable, unique };
}

type Random = () => number;

function shuffle<T>(items: T[], random: Random = Math.random): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

const shareCodePattern = /^R([456])([123])([0-9A-Z]{8})$/;
const shareHash = (verifierCount: number, difficulty: number, seed: string) => `R${verifierCount}${difficulty + 1} ${seed}`;

function randomSeed() {
  return Math.floor(Math.random() * 36 ** 8).toString(36).toUpperCase().padStart(8, '0');
}

function seededRandom(seed: string): Random {
  let state = 2166136261;
  for (const char of seed) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const cardOptionsCache = new WeakMap<PuzzleWithCards[], Map<number, number[]>>();

function getCardLawOptions(bank: PuzzleWithCards[]) {
  const cached = cardOptionsCache.get(bank);
  if (cached) return cached;
  const options = bank.reduce((result, game) => {
    game.ind.forEach((card, index) => result.set(card, [...new Set([...(result.get(card) ?? []), game.law[index]])]));
    return result;
  }, new Map<number, number[]>());
  cardOptionsCache.set(bank, options);
  return options;
}

export function generateGame(verifierCount: number, difficulty: number, bank: PuzzleWithCards[], shareSeed = randomSeed()): Game {
  const n = Math.max(4, Math.min(6, verifierCount));
  const level = Math.max(0, Math.min(2, difficulty));
  const random = seededRandom(`${n}:${level}:${shareSeed}`);
  const cardLawOptions = getCardLawOptions(bank);
  const simple = Array.from({ length: 25 }, (_, index) => index + 1);
  const complex = Array.from({ length: 23 }, (_, index) => index + 26);
  const pool = level === 0 ? simple : level === 2 ? [...complex, ...complex, ...simple] : [...simple, ...complex];

  for (let attempt = 0; attempt < 30000; attempt += 1) {
    const target = allCodes[Math.floor(random() * allCodes.length)];
    const cards = shuffle([...new Set(shuffle(pool, random))], random).slice(0, n).sort((a, b) => a - b);
    const laws = cards.map((card) => cardLawOptions.get(card)?.find((law) => evaluateLaw(law, target)));
    if (laws.some((law) => law === undefined)) continue;
    const candidate: Game = {
      hash: shareHash(n, level, shareSeed),
      n,
      code: Number(target.join('')),
      par: n + 2 + level * 2,
      ind: cards,
      law: laws as number[],
      crypt: cards.map(() => 200 + Math.floor(random() * 600)),
      color: level,
      source: 'bank',
    };
    const audit = analyzeGame(candidate);
    if (audit.unique && audit.expectedPasses && audit.everyOtherCodeFails && audit.indispensable) return candidate;
  }

  const fallback = { ...initialGame, hash: shareHash(n, level, shareSeed), color: level };
  const audit = analyzeGame(fallback);
  if (!audit.unique || !audit.expectedPasses || !audit.everyOtherCodeFails || !audit.indispensable) throw new Error('无法生成通过唯一解校验的题目。');
  return fallback;
}

export function gameFromShareCode(input: string, bank: PuzzleWithCards[]) {
  const clean = input.replace(/[^a-z0-9]/gi, '').toUpperCase();
  const match = clean.match(shareCodePattern);
  if (!match) return null;
  return generateGame(Number(match[1]), Number(match[2]) - 1, bank, match[3]);
}
