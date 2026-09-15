'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { cardHints, cardLawOptions, Digits, evaluateLaw, Game, initialGame, lawText, solutionDigits } from './lib/turing';
import { verifierGuide } from './lib/verifier-guide';
import { gameFromShareCode, generateGame } from './lib/generator';
import { chinaDateKey, createDailyMasterRun, DeductionMarks, formatDuration, MASTER_REST_MS, MasterAnswer, MasterRoundRecord, MasterRun, questionElapsed, remainingMs, runElapsed } from './lib/master';
import { colourText, difficultyText, englishCardHints, englishLawText, englishVerifierGuide, LANGUAGE_STORAGE, Locale, ui } from './lib/i18n';
import challengeBankData from './data/challenge-bank.json';
import { ruleSlides } from './data/rule-slides';
import { englishRulebookPdfBase64 } from './data/rulebook-en-pdf';

type Answer = MasterAnswer;
type RoundRecord = MasterRoundRecord;
type ResultState = 'playing' | 'wrong' | 'win' | 'revealed';
type BankGame = Game & { page: number; position: number };
type DifficultyLevel = 0 | 1 | 2;
type MasterTab = 'analysis' | 'questions';
type ReviewSession = { source: 'master'; index: number };
type PuzzleSource = 'bank' | 'random' | 'master';
type HistoryTab = DifficultyLevel | 'master';
// 一条历史记录 = 玩过的一道题（默认题库 / 随机生成题 / 大师挑战）。
// game 保存完整题目快照，hash 保留原题号（题库题号、随机题分享码）；大师挑战另存挑战编号。
type PuzzleHistoryEntry = {
  id: string;
  hash: string;
  source: PuzzleSource;
  difficulty: DifficultyLevel;
  game: Game;
  playedAt: number;
  questions: number;
  rounds: number;
  solved: boolean;
  dateKey?: string;
  mode?: MasterRun['mode'];
  masterIndex?: number;
};

const colors = ['blue', 'yellow', 'purple'];
const challengeBank = challengeBankData as BankGame[];
let englishRulebookObjectUrl: string | null = null;

function getEnglishRulebookUrl() {
  if (englishRulebookObjectUrl) return englishRulebookObjectUrl;
  const binary = window.atob(englishRulebookPdfBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  englishRulebookObjectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  return englishRulebookObjectUrl;
}

function BrandName({ locale }: { locale: Locale }) {
  return <span>{locale === 'en' ? <>TURING <b>MACHINE</b></> : <>图灵<b>机</b></>}</span>;
}

const verifierReference = Object.keys(cardHints).map(Number).sort((a, b) => a - b).map((card) => ({
  card,
  laws: cardLawOptions[card] ?? [],
}));
const SOLO_STORAGE = 'tm-solo-progress';
const MASTER_STORAGE = 'tm-master-progress';
const MASTER_FORMAL_DAYS = 'tm-master-formal-days';
const MASTER_RESULTS = 'tm-master-results';
const HISTORY_STORAGE = 'tm-puzzle-history';
const HISTORY_LIMIT = 200;
const difficultyClasses = ['beginner', 'standard', 'hard'] as const;
const resetDigits = () => [3, 1, 4] as Digits;
const resetDeductionMarks = (): DeductionMarks => [[], [], []];
const normalizeDeductionMarks = (marks: unknown): DeductionMarks => Array.isArray(marks) && marks.length === 3
  ? marks.map((column) => Array.isArray(column) ? column.filter((digit): digit is number => Number.isInteger(digit) && digit >= 1 && digit <= 5) : []) as DeductionMarks
  : resetDeductionMarks();
const difficultyOf = (game: Game): DifficultyLevel => game.hash.startsWith('R') ? Math.max(0, Math.min(2, Number(game.color ?? 0))) as DifficultyLevel : game.hash.trim().startsWith('C') ? 2 : game.hash.trim().startsWith('B') ? 1 : 0;
const currentQuestion = (run: MasterRun) => run.questions[run.index];
const normalizeMasterRun = (run: MasterRun): MasterRun => ({ ...run, questions: run.questions.map((question) => ({ ...question, guessUses: question.guessUses ?? {}, history: question.history ?? [], deductionMarks: normalizeDeductionMarks(question.deductionMarks), scratch: typeof question.scratch === 'string' ? question.scratch : '' })) });
const usesLegacyArrangementEstimate = (question: MasterRun['questions'][number]) => question.questions > 0 && !(question.history?.length);
const arrangementCount = (question: MasterRun['questions'][number]) => question.history?.length || (question.questions > 0 ? question.guesses.length : 0);
const puzzleSourceOf = (game: Game): PuzzleSource => game.hash.trim().startsWith('R') ? 'random' : 'bank';
const historyEntryId = (source: PuzzleSource, hash: string, master?: { dateKey: string; mode: MasterRun['mode']; index: number }) => source === 'master' && master ? `master:${master.dateKey}:${master.mode}:${master.index}` : `${source}:${hash}`;
const formatPlayedAt = (value: number) => { const date = new Date(value); const pad = (number: number) => String(number).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`; };
function normalizeHistoryEntry(value: unknown): PuzzleHistoryEntry | null {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Partial<PuzzleHistoryEntry>;
  if (typeof entry.id !== 'string' || !entry.game || typeof entry.game.hash !== 'string' || !Array.isArray(entry.game.law)) return null;
  return {
    id: entry.id,
    hash: typeof entry.hash === 'string' ? entry.hash : entry.game.hash.trim(),
    source: entry.source === 'random' || entry.source === 'master' ? entry.source : 'bank',
    difficulty: entry.difficulty === 1 || entry.difficulty === 2 ? entry.difficulty : 0,
    game: entry.game,
    playedAt: typeof entry.playedAt === 'number' ? entry.playedAt : 0,
    questions: typeof entry.questions === 'number' ? entry.questions : 0,
    rounds: typeof entry.rounds === 'number' ? entry.rounds : 0,
    solved: Boolean(entry.solved),
    dateKey: typeof entry.dateKey === 'string' ? entry.dateKey : undefined,
    mode: entry.mode === 'formal' || entry.mode === 'practice' ? entry.mode : undefined,
    masterIndex: typeof entry.masterIndex === 'number' ? entry.masterIndex : undefined,
  };
}
function readStoredPuzzleHistory(): PuzzleHistoryEntry[] {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_STORAGE) ?? '[]');
    if (!Array.isArray(saved)) return [];
    return saved.map(normalizeHistoryEntry).filter((entry): entry is PuzzleHistoryEntry => Boolean(entry));
  } catch { return []; }
}

function ScratchPad({ value, locale, onChange, readOnly = false }: { value: string; locale: Locale; onChange?: (value: string) => void; readOnly?: boolean }) {
  const t = (text: string) => ui(locale, text);
  return <aside className={`scratch-panel ${readOnly ? 'read-only' : ''}`} aria-label={t(readOnly ? '本题推理草稿，只读' : '推理草稿')}><div className="scratch-head"><strong>{t('推理草稿')}</strong><small>{t(readOnly ? '只读记录' : '自动保存')}</small></div><textarea value={value} onChange={(event) => onChange?.(event.target.value)} readOnly={readOnly} placeholder={t(readOnly ? '本题没有保存推理草稿。' : '在这里记录排除过程、可能的标准与下一步思路……（仍建议你用纸笔推理）')} aria-label={t(readOnly ? '本题保存的推理草稿' : '输入推理草稿')} spellCheck={false}/></aside>;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>('zh');
  const [languageReady, setLanguageReady] = useState(false);
  const [game, setGame] = useState<Game>(initialGame);
  const [digits, setDigits] = useState<Digits>(resetDigits);
  const [selected, setSelected] = useState<number[]>([0]);
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [round, setRound] = useState(1);
  const [questions, setQuestions] = useState(0);
  const [deductionMarks, setDeductionMarks] = useState<DeductionMarks>(resetDeductionMarks);
  const [scratchNote, setScratchNote] = useState('');
  const [result, setResult] = useState<ResultState>('playing');
  const [visibleAnswers, setVisibleAnswers] = useState<Answer[]>([]);
  const [showAnswerPrompt, setShowAnswerPrompt] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showRuleBook, setShowRuleBook] = useState(false);
  const [showVerifierReference, setShowVerifierReference] = useState(false);
  const [showInfoHistory, setShowInfoHistory] = useState(false);
  const [puzzleHistory, setPuzzleHistory] = useState<PuzzleHistoryEntry[]>(readStoredPuzzleHistory);
  const [showPicker, setShowPicker] = useState(false);
  const [showMasterIntro, setShowMasterIntro] = useState(false);
  const [showAbandonPrompt, setShowAbandonPrompt] = useState(false);
  const [restReviewOpen, setRestReviewOpen] = useState(true);
  const [master, setMaster] = useState<MasterRun | null>(null);
  const [masterTab, setMasterTab] = useState<MasterTab>('analysis');
  const [masterExpandedQuestion, setMasterExpandedQuestion] = useState<number | null>(null);
  const [reviewSession, setReviewSession] = useState<ReviewSession | null>(null);
  const [hashInput, setHashInput] = useState('');
  const [verifierCount, setVerifierCount] = useState(4);
  const [difficulty, setDifficulty] = useState(1);
  const [bankPage, setBankPage] = useState(1);
  const [message, setMessage] = useState<'' | 'incomplete-code' | 'not-found'>('');
  const [restored, setRestored] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let savedLocale: Locale = 'zh';
    try { if (localStorage.getItem(LANGUAGE_STORAGE) === 'en') savedLocale = 'en'; } catch { /* Use Chinese when storage is unavailable. */ }
    const restoreLanguage = window.setTimeout(() => { setLocale(savedLocale); setLanguageReady(true); }, 0);
    return () => window.clearTimeout(restoreLanguage);
  }, []);
  useEffect(() => {
    if (!languageReady) return;
    try { localStorage.setItem(LANGUAGE_STORAGE, locale); } catch { /* Language switching still works for this session. */ }
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
    document.title = locale === 'en' ? 'Turing Machine · Solo Offline Edition' : '图灵机 · 单人离线版';
  }, [languageReady, locale]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    try {
      const savedMaster = localStorage.getItem(MASTER_STORAGE);
      if (savedMaster) {
        const run = normalizeMasterRun(JSON.parse(savedMaster) as MasterRun);
        if (run.questions?.length === 10 && run.questions[run.index]?.game) { const question = run.questions[run.index]; setMaster(run); setGame(question.game); setHistory(question.history); setRound(question.history.length + 1); setQuestions(question.questions); setDigits(question.history.at(-1)?.guess ?? resetDigits()); setDeductionMarks(normalizeDeductionMarks(question.deductionMarks)); setScratchNote(question.scratch ?? ''); setRestored(true); return; }
      }
      const savedSolo = localStorage.getItem(SOLO_STORAGE);
      if (savedSolo) {
        const data = JSON.parse(savedSolo);
        if (data.game?.law?.length && data.game?.ind?.length) { setGame(data.game); setDigits(data.digits ?? resetDigits()); setHistory(data.history ?? []); setRound(data.round ?? 1); setQuestions(data.questions ?? 0); setDeductionMarks(normalizeDeductionMarks(data.deductionMarks)); setScratchNote(typeof data.scratchNote === 'string' ? data.scratchNote : ''); }
      }
    } catch { /* Ignore stale local progress. */ }
    setRestored(true);
  }, []);
  useEffect(() => { if (restored && !master) localStorage.setItem(SOLO_STORAGE, JSON.stringify({ game, digits, history, round, questions, deductionMarks, scratchNote })); }, [game, digits, history, round, questions, deductionMarks, scratchNote, restored, master]);
  useEffect(() => { try { localStorage.setItem(HISTORY_STORAGE, JSON.stringify(puzzleHistory)); } catch { /* History stays available for this session. */ } }, [puzzleHistory]);
  useEffect(() => {
    if (!master) return;
    if (master.status === 'playing' || master.status === 'resting') localStorage.setItem(MASTER_STORAGE, JSON.stringify(master));
    if (master.status === 'failed' || master.status === 'completed') {
      localStorage.removeItem(MASTER_STORAGE);
      const saved = JSON.parse(localStorage.getItem(MASTER_RESULTS) ?? '[]') as MasterRun[];
      const key = `${master.dateKey}-${master.mode}-${master.startedAt}`;
      if (!saved.some((item) => `${item.dateKey}-${item.mode}-${item.startedAt}` === key)) localStorage.setItem(MASTER_RESULTS, JSON.stringify([master, ...saved].slice(0, 30)));
    }
  }, [master]);

  const latestAnswers = useMemo(() => new Map(visibleAnswers.map((answer) => [answer.index, answer.pass])), [visibleAnswers]);
  const bankPageGames = useMemo(() => challengeBank.filter((item) => item.page === bankPage), [bankPage]);
  const masterQuestion = master ? currentQuestion(master) : null;
  const masterDifficulty = masterQuestion?.difficulty ?? difficultyOf(game);
  const currentDifficultyMeta = { className: difficultyClasses[masterDifficulty], label: difficultyText(locale, masterDifficulty) };
  const masterRemaining = master ? remainingMs(master, now) : 0;
  const restRemaining = master?.status === 'resting' && master.restEndsAt ? Math.max(0, master.restEndsAt - now) : 0;

  const clearRound = (nextGame: Game) => { setGame(nextGame); setDigits(resetDigits()); setSelected([0]); setHistory([]); setRound(1); setQuestions(0); setDeductionMarks(resetDeductionMarks()); setScratchNote(''); setVisibleAnswers([]); setResult('playing'); setMessage(''); };
  // 记录“玩过的题”：默认题库、随机生成题与大师挑战都走这一个入口，不另建记录系统。
  const recordPuzzlePlay = (playedGame: Game, source: PuzzleSource, difficulty: DifficultyLevel, extra: { asked?: number; solved?: boolean; dateKey?: string; mode?: MasterRun['mode']; masterIndex?: number } = {}) => {
    const hash = playedGame.hash.trim();
    const master = source === 'master' && extra.dateKey !== undefined && extra.masterIndex !== undefined ? { dateKey: extra.dateKey, mode: extra.mode ?? 'practice', index: extra.masterIndex } : undefined;
    const id = historyEntryId(source, hash, master);
    setPuzzleHistory((current) => {
      const existing = current.find((item) => item.id === id);
      const entry: PuzzleHistoryEntry = {
        id,
        hash,
        source,
        difficulty,
        game: playedGame,
        playedAt: Date.now(),
        questions: (existing?.questions ?? 0) + (extra.asked ?? 0),
        rounds: (existing?.rounds ?? 0) + (extra.asked || extra.solved ? 1 : 0),
        solved: Boolean(extra.solved) || Boolean(existing?.solved),
        dateKey: extra.dateKey ?? existing?.dateKey,
        mode: extra.mode ?? existing?.mode,
        masterIndex: extra.masterIndex ?? existing?.masterIndex,
      };
      return [entry, ...current.filter((item) => item.id !== id)].slice(0, HISTORY_LIMIT);
    });
  };
  const updateMaster = (change: (run: MasterRun) => MasterRun) => setMaster((current) => current ? change(current) : current);
  const toggleDeductionMark = (colorIndex: number, digit: number) => {
    const next = deductionMarks.map((column, index) => index === colorIndex
      ? column.includes(digit) ? column.filter((item) => item !== digit) : [...column, digit]
      : [...column]) as DeductionMarks;
    setDeductionMarks(next);
    if (master) updateMaster((run) => {
      const questionsCopy = [...run.questions];
      questionsCopy[run.index] = { ...questionsCopy[run.index], deductionMarks: next };
      return { ...run, questions: questionsCopy };
    });
  };
  const changeScratchNote = (value: string) => {
    setScratchNote(value);
    if (master) updateMaster((run) => {
      const questionsCopy = [...run.questions];
      questionsCopy[run.index] = { ...questionsCopy[run.index], scratch: value };
      return { ...run, questions: questionsCopy };
    });
  };
  const changeDigit = (index: number, delta: number) => { if (master && master.status !== 'playing') return; setDigits((current) => current.map((digit, i) => i === index ? ((digit - 1 + delta + 5) % 5) + 1 : digit) as Digits); setVisibleAnswers([]); setResult('playing'); };
  const toggleVerifier = (index: number) => { if (master && master.status !== 'playing') return; setVisibleAnswers([]); setSelected((current) => current.includes(index) ? current.filter((item) => item !== index) : current.length < 3 ? [...current, index] : current); };

  const askVerifiers = () => {
    if (!selected.length || master?.status === 'resting') return;
    const guess = [...digits] as Digits;
    const asked = [...selected];
    const answers = asked.map((index) => ({ index, pass: evaluateLaw(game.law[index], guess) }));
    setHistory((current) => [...current, { round, guess, answers }]); setQuestions((current) => current + asked.length); setRound((current) => current + 1); setVisibleAnswers(answers); setSelected([]); setResult('playing');
    if (master?.status === 'playing') {
      const question = currentQuestion(master);
      recordPuzzlePlay(question.game, 'master', question.difficulty, { asked: asked.length, dateKey: master.dateKey, mode: master.mode, masterIndex: master.index });
    } else if (!master) recordPuzzlePlay(game, puzzleSourceOf(game), difficultyOf(game), { asked: asked.length });
    if (master?.status === 'playing') updateMaster((run) => {
      const q = currentQuestion(run); const verifierUses = { ...q.verifierUses }; const guessUses = { ...(q.guessUses ?? {}) }; const code = guess.join('');
      asked.forEach((index) => { const card = String(q.game.ind[index]); verifierUses[card] = (verifierUses[card] ?? 0) + 1; });
      guessUses[code] = (guessUses[code] ?? 0) + asked.length;
      const guesses = q.guesses.includes(code) ? q.guesses : [...q.guesses, code];
      const questionsCopy = [...run.questions]; questionsCopy[run.index] = { ...q, questions: q.questions + asked.length, verifierUses, guesses, guessUses, history: [...(q.history ?? []), { round, guess, answers }] };
      return { ...run, questions: questionsCopy };
    });
  };

  const pauseQuestion = (run: MasterRun, at: number) => { const q = currentQuestion(run); const questionsCopy = [...run.questions]; questionsCopy[run.index] = { ...q, activeMs: questionElapsed(q, at), activeStartedAt: null }; return { ...run, questions: questionsCopy }; };
  const submitCode = () => {
    const correct = digits.join('') === String(game.code);
    if (!master) { recordPuzzlePlay(game, puzzleSourceOf(game), difficultyOf(game), { solved: correct }); setResult(correct ? 'win' : 'wrong'); return; }
    if (master.status !== 'playing') return;
    const at = Date.now();
    const masterQuestion = currentQuestion(master);
    recordPuzzlePlay(masterQuestion.game, 'master', masterQuestion.difficulty, { solved: correct, dateKey: master.dateKey, mode: master.mode, masterIndex: master.index });
    updateMaster((current) => {
      const q = currentQuestion(current); const guess = digits.join(''); const guesses = q.guesses.includes(guess) ? q.guesses : [...q.guesses, guess];
      let next = { ...current, questions: current.questions.map((item, index) => index === current.index ? { ...item, guesses, submissions: item.submissions + 1 } : item) };
      if (!correct) return next;
      next = pauseQuestion(next, at); const completed = [...next.questions]; completed[next.index] = { ...completed[next.index], completed: true };
      return next.index === 9 ? { ...next, questions: completed, status: 'completed', completedAt: at, restEndsAt: null } : { ...next, questions: completed, status: 'resting', restEndsAt: at + MASTER_REST_MS };
    });
    if (correct) setRestReviewOpen(true);
    setResult(correct ? 'playing' : 'wrong');
  };
  const advanceMaster = () => {
    if (!master || master.status !== 'resting' || master.index >= 9) return;
    const at = Date.now(); const nextIndex = master.index + 1; const nextGame = master.questions[nextIndex].game;
    setMaster((current) => current ? { ...current, status: 'playing', index: nextIndex, restEndsAt: null, questions: current.questions.map((q, index) => index === nextIndex ? { ...q, activeStartedAt: at } : q) } : current);
    setRestReviewOpen(true);
    clearRound(nextGame);
  };
  useEffect(() => {
    if (!master) return;
    if (master.status === 'playing' && master.mode === 'formal' && masterRemaining <= 0) { setMasterTab('questions'); setMaster((current) => current ? { ...pauseQuestion(current, Date.now()), status: 'failed', failedAt: Date.now(), restEndsAt: null } : current); }
    if (master.status === 'resting' && restRemaining <= 0) advanceMaster();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master?.status, master?.mode, masterRemaining, restRemaining, now]);

  const resetProgress = (nextGame: Game) => { setMaster(null); localStorage.removeItem(MASTER_STORAGE); clearRound(nextGame); localStorage.removeItem(SOLO_STORAGE); };
  const t = (text: string) => ui(locale, text);
  const loadChallenge = (kind: 'hash' | 'random') => {
    const cleanHash = hashInput.replace(/[^a-z0-9]/gi, '').toUpperCase();
    if (kind === 'hash' && cleanHash.length < 5) { setMessage('incomplete-code'); return; }
    setMessage('');
    if (kind === 'random') { resetProgress(generateGame(verifierCount, difficulty, challengeBank)); setShowPicker(false); return; }
    const found = challengeBank.find((item) => item.hash.replace(/[^a-z0-9]/gi, '').toUpperCase() === cleanHash) ?? gameFromShareCode(cleanHash, challengeBank);
    if (!found) { setMessage('not-found'); return; }
    resetProgress(found); setHashInput(''); setShowPicker(false);
  };
  // 导入历史：按记录 ID（题库题号 / 随机题分享码 / 大师挑战编号）去重合并，重复导入同一文件不会产生重复记录。
  const mergePuzzleHistory = (incoming: PuzzleHistoryEntry[]) => setPuzzleHistory((current) => {
    const merged = new Map(current.map((entry) => [entry.id, entry]));
    incoming.forEach((entry) => {
      const existing = merged.get(entry.id);
      merged.set(entry.id, existing
        ? { ...entry, ...existing, questions: Math.max(existing.questions, entry.questions), rounds: Math.max(existing.rounds, entry.rounds), solved: existing.solved || entry.solved, playedAt: Math.max(existing.playedAt, entry.playedAt) }
        : entry);
    });
    return [...merged.values()].sort((a, b) => b.playedAt - a.playedAt).slice(0, HISTORY_LIMIT);
  });
  // 从历史记录重新进入原题：复用与“载入题目”完全相同的解析链（题库题号 → 随机题分享码 → 本地题目快照）。
  const openHistoryEntry = (entry: PuzzleHistoryEntry) => {
    const cleanHash = entry.hash.replace(/[^a-z0-9]/gi, '').toUpperCase();
    const found = challengeBank.find((item) => item.hash.replace(/[^a-z0-9]/gi, '').toUpperCase() === cleanHash) ?? gameFromShareCode(cleanHash, challengeBank) ?? entry.game;
    resetProgress(found); setShowInfoHistory(false);
  };
  const playAnother = () => {
    const nextVerifierCount = 4 + Math.floor(Math.random() * 3);
    resetProgress(generateGame(nextVerifierCount, difficultyOf(game), challengeBank));
    setShowPicker(false);
  };
  const beginMaster = () => {
    const dateKey = chinaDateKey(); const formalDays = JSON.parse(localStorage.getItem(MASTER_FORMAL_DAYS) ?? '{}') as Record<string, true>; const mode = formalDays[dateKey] ? 'practice' : 'formal';
    if (mode === 'formal') localStorage.setItem(MASTER_FORMAL_DAYS, JSON.stringify({ ...formalDays, [dateKey]: true }));
    const run = createDailyMasterRun(dateKey, mode, challengeBank); setMaster(run); clearRound(run.questions[0].game); setShowMasterIntro(false); setShowPicker(false); setMasterTab('analysis'); setMasterExpandedQuestion(null);
  };
  const continueTraining = () => { if (!master || master.status !== 'failed') return; const at = Date.now(); setMaster((current) => current ? { ...current, mode: 'practice', status: 'playing', questions: current.questions.map((q, index) => index === current.index ? { ...q, activeStartedAt: at } : q) } : current); setResult('playing'); };
  const exitMaster = () => { setMaster(null); localStorage.removeItem(MASTER_STORAGE); clearRound(initialGame); };
  const abandonMaster = () => { setShowAbandonPrompt(false); exitMaster(); };
  const changeLocale = (nextLocale: Locale) => { setLocale(nextLocale); setShowRules(false); };
  const openRuleBook = () => {
    if (locale === 'en') {
      window.open(getEnglishRulebookUrl(), '_blank', 'noopener,noreferrer');
      return;
    }
    setShowRules(false);
    setShowRuleBook(true);
  };
  const backToInfoMenu = (close: () => void) => { close(); setShowRules(true); };

  const sourceLabel = master
    ? `${master.mode === 'formal' ? (locale === 'en' ? 'Official Challenge' : '正式挑战') : (locale === 'en' ? 'Practice Challenge' : '练习挑战')} · ${locale === 'en' ? 'China Standard Time' : '北京'} ${master.dateKey}`
    : game.hash.startsWith('R') ? (locale === 'en' ? 'Locally Generated' : '本地随机生成') : (locale === 'en' ? 'Offline Challenge Bank' : '离线挑战合集');
  const masterStats = useMemo(() => master ? buildMasterStats(master, now) : null, [master, now]);
  const masterRunActive = Boolean(master && (master.status === 'playing' || master.status === 'resting'));
  const reviewRun = master;
  const completedReviewIndices = reviewRun?.questions.map((question, index) => question.completed ? index : -1).filter((index) => index >= 0) ?? [];
  const reviewPosition = reviewSession ? completedReviewIndices.indexOf(reviewSession.index) : -1;

  if (reviewSession && reviewRun && reviewPosition >= 0) return <MasterReview locale={locale} onChangeLocale={changeLocale} question={reviewRun.questions[reviewSession.index]} index={reviewSession.index} previousIndex={completedReviewIndices[reviewPosition - 1] ?? null} nextIndex={completedReviewIndices[reviewPosition + 1] ?? null} onNavigate={(index) => setReviewSession({ ...reviewSession, index })} onBack={() => setReviewSession(null)}/>;

  return <main>
    <nav className="topbar"><a className="brand" href="#top" aria-label={locale === 'en' ? 'Turing Machine solo puzzle home' : '图灵机单人解谜首页'}><span className="brand-mark">T</span><BrandName locale={locale}/></a><div className="nav-actions">{!master && <button className="master-button" onClick={() => setShowMasterIntro(true)}>♛ {t('图灵大师挑战')}</button>}{!master && <button className={`text-button ${showPicker ? 'active' : ''}`} aria-expanded={showPicker} onClick={() => setShowPicker((open) => !open)}>{t('换一题')}</button>}{master?.status === 'resting' && !restReviewOpen && <button className="rest-review-button" onClick={() => setRestReviewOpen(true)}>{locale === 'en' ? `Review ${formatDuration(restRemaining)} · View Criteria` : `复盘中 ${formatDuration(restRemaining)} · 查看逻辑`}</button>}{master && (master.status === 'playing' || master.status === 'resting') && <button className="exit-master-button" onClick={() => setShowAbandonPrompt(true)}>{t('退出挑战')}</button>}<RulesMenu locale={locale} open={showRules} onToggle={() => setShowRules((open) => !open)} onOpenHistory={() => { setShowRules(false); setShowInfoHistory(true); }} onOpenRules={openRuleBook} onOpenReference={() => { setShowRules(false); setShowVerifierReference(true); }}/><LanguageSwitch locale={locale} onChange={changeLocale}/></div></nav>
    <section className={`game-shell ${master ? 'master-shell' : ''}`} id="top">
      {showPicker && !master && <Picker locale={locale} bankPage={bankPage} setBankPage={setBankPage} games={bankPageGames} difficulty={difficulty} setDifficulty={setDifficulty} verifierCount={verifierCount} setVerifierCount={setVerifierCount} hashInput={hashInput} setHashInput={setHashInput} message={message} loadChallenge={loadChallenge} selectGame={(next) => { resetProgress(next); setShowPicker(false); }}/>}
      <header className="game-heading"><div><p className="eyebrow">{sourceLabel} · {locale === 'en' ? `${game.n} Verifiers` : `${game.n} 个验证器`}</p><h1>{master ? t('图灵大师挑战') : t('找出唯一的三位密码')}</h1><p className="intro">{master ? (locale === 'en' ? `${master.index + 1}/10 · Puzzle ${master.index + 1} of 10. Solve the current code to continue.` : `${master.index + 1}/10 共 10 道题，当前第 ${master.index + 1} 题。答对当前密码才可进入下一题。`) : (locale === 'en' ? 'Build a proposal and question up to 3 Verifiers each round. An answer only tells you whether your proposal passes that Verifier’s hidden criterion.' : '组合一个猜测，每轮向最多 3 个验证器提问。答案只说明你的猜测是否通过该验证器的隐藏标准。')}</p></div><div className={`challenge-code difficulty-code ${currentDifficultyMeta.className} ${master ? 'master-clock' : ''}`} aria-label={master ? (master.mode === 'formal' ? (locale === 'en' ? 'Turing Master challenge timer' : '图灵大师挑战计时') : (locale === 'en' ? 'Untimed Turing Master practice' : '图灵大师无计时练习')) : (locale === 'en' ? `Challenge code ${game.hash}, ${currentDifficultyMeta.label} difficulty` : `挑战代码 ${game.hash}，${currentDifficultyMeta.label}难度`)}><i className="difficulty-corner">{currentDifficultyMeta.label}</i><span>{master ? 'TURING MASTER' : locale === 'en' ? 'CHALLENGE' : '挑战'}</span><strong>{master ? (master.mode === 'formal' ? formatDuration(masterRemaining) : (locale === 'en' ? 'FREE PRACTICE' : '自由练习')) : game.hash.trim()}</strong><small className="difficulty-dots">{[0, 1, 2].map((dot) => <i className={dot <= masterDifficulty ? 'filled' : 'empty'} key={dot} />)}</small>{master?.mode === 'practice' && <em>{locale === 'en' ? 'No time limit' : '无计时限制'}</em>}</div></header>
      <div className="workspace"><section className="machine-panel" aria-labelledby="guess-title"><div className="panel-title"><div><span className="step">01</span><h2 id="guess-title">{t('组成你的方案')}</h2></div><span className="round-chip">{locale === 'en' ? `Round ${round}` : `第 ${round} 轮`}</span></div><div className="digit-rack" aria-label={locale === 'en' ? `Current proposal: ${digits.join(' ')}` : `当前猜测为 ${digits.join(' ')}`}>{digits.map((digit, index) => <div className={`digit-card digit-${index + 1}`} key={index}><button className="digit-adjust-button" onClick={() => changeDigit(index, 1)} aria-label={locale === 'en' ? `Increase the ${colourText(locale, index)} number` : `增加${colourText(locale, index)}数字`}><span className="digit-arrow digit-arrow-up" aria-hidden="true"/></button><strong>{digit}</strong><button className="digit-adjust-button" onClick={() => changeDigit(index, -1)} aria-label={locale === 'en' ? `Decrease the ${colourText(locale, index)} number` : `减少${colourText(locale, index)}数字`}><span className="digit-arrow digit-arrow-down" aria-hidden="true"/></button></div>)}</div><div className="round-rule"><span>{t('本轮方案')}</span><strong>{digits.join('')}</strong><span>{t('最多选择 3 个验证器')}</span></div><div className="panel-title verifier-heading"><div><span className="step">02</span><h2>{t('选择要询问的验证器')}</h2></div><span className="selection-count">{locale === 'en' ? `Selected ${selected.length}/3` : `已选 ${selected.length}/3`}</span></div><div className={`verifier-grid verifier-count-${game.n}`}>{game.ind.map((card, index) => { const active = selected.includes(index); const latest = latestAnswers.get(index); return <button className={`verifier-card ${active ? 'active' : ''}`} key={`${game.hash}-${index}`} onClick={() => toggleVerifier(index)} aria-pressed={active}><span className="verifier-letter">{String.fromCharCode(65 + index)}</span><span className="verifier-info"><small>{locale === 'en' ? `Criteria Card ${card} · Verification ${game.crypt[index]}` : `标准卡 ${card} · 校验 ${game.crypt[index]}`}</small><strong>{locale === 'en' ? englishCardHints[card] : cardHints[card]}</strong></span><span className={`check ${latest === undefined ? '' : latest ? 'passed' : 'failed'}`}>{active ? '✓' : latest === undefined ? '+' : latest ? '✓' : '✕'}</span></button>; })}</div><button className="ask-button" onClick={askVerifiers} disabled={selected.length === 0 || Boolean(master && master.status !== 'playing')}>{locale === 'en' ? `Question ${selected.length} Verifier${selected.length === 1 ? '' : 's'}` : `向 ${selected.length} 个验证器提问`} <span>→</span></button><div className="submit-zone"><div><small>{t(master ? '确认后无法撤回本次提交' : '认为已经确定答案？')}</small><strong>{locale === 'en' ? `Submit Proposal ${digits.join('')}` : `提交当前方案 ${digits.join('')}`}</strong></div><div className="submit-actions">{!master && <button className="reveal-button" onClick={() => setShowAnswerPrompt(true)}>{t('查看答案')}</button>}<button onClick={submitCode}>{t('验证密码')}</button></div></div>{result === 'wrong' && <p className="wrong-message">{t('这个密码不正确。')}{t(master ? '继续推理，答对后才能进入下一题。' : '你仍可继续询问和推理。')}</p>}</section><ScratchPad locale={locale} value={scratchNote} onChange={changeScratchNote}/><Notes locale={locale} history={history} questions={questions} verifierCount={game.n} deductionMarks={deductionMarks} onToggleDeduction={toggleDeductionMark}/></div>
    </section>
    {showMasterIntro && <div className="overlay result-overlay"><section className="master-intro" role="dialog" aria-modal="true"><div className="crown">♛</div><p className="eyebrow">TURING MASTER</p><h2>{t('挑战成为图灵大师？')}</h2><p>{t('北京时间每日固定 10 题：2 道入门、4 道标准、4 道困难。正式解题时间共 60 分钟；每题答对后有 2 分钟不计时复盘。只能答对当前题后进入下一题，挑战中不可查看答案。')}</p><div><button className="secondary-button" onClick={() => setShowMasterIntro(false)}>{t('否，暂不参加')}</button><button className="master-start" onClick={beginMaster}>{t('是，开始挑战')}</button></div><small>{t('同一天首次开始为正式挑战；之后可练习重玩，不覆盖正式成绩。')}</small></section></div>}
    {showRuleBook && <RuleBook locale={locale} onClose={() => setShowRuleBook(false)} onBack={() => backToInfoMenu(() => setShowRuleBook(false))}/>} 
    {showVerifierReference && <VerifierReference locale={locale} onClose={() => setShowVerifierReference(false)}/>} 
    {showInfoHistory && <InfoHistory locale={locale} entries={puzzleHistory} locked={masterRunActive} onOpen={openHistoryEntry} onMerge={mergePuzzleHistory} onClose={() => setShowInfoHistory(false)}/>}
    {showAnswerPrompt && !master && <div className="overlay result-overlay"><section className="answer-prompt" role="dialog" aria-modal="true"><div className="prompt-mark">?</div><h2>{t('或许还差一步推导出来，是否现在查看答案？')}</h2><div><button className="secondary-button" onClick={() => setShowAnswerPrompt(false)}>{t('否，继续推理')}</button><button className="random-button" onClick={() => { setShowAnswerPrompt(false); setResult('revealed'); }}>{t('是，查看答案')}</button></div></section></div>}
    {showAbandonPrompt && master && <div className="overlay result-overlay"><section className="answer-prompt abandon-prompt" role="dialog" aria-modal="true"><div className="prompt-mark">!</div><p className="eyebrow">{t('退出图灵大师挑战')}</p><h2>{t('确定要放弃当前挑战吗？')}</h2><p>{t(master.mode === 'formal' ? '放弃后将立即退出，并失去今天再次进行正式挑战的资格。今天再次进入时，只能以无计时练习模式重玩当日题组。' : '退出后本次练习进度不会保留。今天仍可重新开始无计时练习。')}</p><div><button className="secondary-button" onClick={() => setShowAbandonPrompt(false)}>{t('继续挑战')}</button><button className="abandon-button" onClick={abandonMaster}>{t('确认放弃')}</button></div></section></div>}
    {!master && (result === 'win' || result === 'revealed') && <div className="overlay result-overlay"><section className="result-card" role="dialog" aria-modal="true"><div className="success-mark">✓</div><p className="eyebrow">{t(result === 'win' ? '解密成功' : '最终答案')}</p><h2>{t(result === 'win' ? '密码正确' : '答案已揭晓')}</h2><div className="solution-digits">{solutionDigits(game).map((digit, index) => <b className={colors[index]} key={index}>{digit}</b>)}</div>{result === 'win' && <p className="performance">{locale === 'en' ? <>Solved in <strong>{history.length}</strong> rounds with <strong>{questions}</strong> questions. The reference score is about {Math.ceil(game.par / 3)} rounds and {game.par} questions.</> : <>你用了 <strong>{history.length}</strong> 轮、<strong>{questions}</strong> 次提问。参考成绩为约 {Math.ceil(game.par / 3)} 轮、{game.par} 次提问。</>}</p>}<LawReveal locale={locale} game={game}/><div className="result-actions"><button className="secondary-button" onClick={() => setResult('playing')}>{t('回看记录')}</button><button className="random-button" onClick={playAnother}>{t('再来一题')}</button></div></section></div>}
    {master?.status === 'resting' && restReviewOpen && <div className="overlay result-overlay"><section className="result-card master-rest" role="dialog" aria-modal="true"><button className="review-minimize" onClick={() => setRestReviewOpen(false)}>{t('收起，查看推理记录')}</button><p className="eyebrow">{locale === 'en' ? `Puzzle ${master.index + 1} Solved` : `第 ${master.index + 1} 题已解开`}</p><div className="success-mark">✓</div><h2>{t('逻辑公布与整理时间')}</h2><p className="rest-countdown">{formatDuration(restRemaining)}</p><p className="performance">{locale === 'en' ? <>Puzzle time <strong>{formatDuration(questionElapsed(currentQuestion(master), now))}</strong> · <strong>{currentQuestion(master).questions}</strong> questions · <strong>{arrangementCount(currentQuestion(master))}</strong> proposals{usesLegacyArrangementEstimate(currentQuestion(master)) ? ' (estimated from old record)' : ''}</> : <>本题用时 <strong>{formatDuration(questionElapsed(currentQuestion(master), now))}</strong> · <strong>{currentQuestion(master).questions}</strong> 次提问 · <strong>{arrangementCount(currentQuestion(master))}</strong> 次排列{usesLegacyArrangementEstimate(currentQuestion(master)) ? '（旧记录估算）' : ''}</>}</p><LawReveal locale={locale} game={game}/><button className="master-start" onClick={advanceMaster}>{t('进入下一道题 →')}</button><small>{t('可收起此页查看本题的全部推理记录；倒计时结束后会自动进入下一题，休息时间不计入 60 分钟。')}</small></section></div>}
    {master?.status === 'failed' && masterStats && <div className="overlay result-overlay"><MasterResult locale={locale} title={t('遗憾，挑战时间结束')} subtitle={t('正式挑战未在 60 分钟内完成')} master={master} stats={masterStats} tab={masterTab} setTab={setMasterTab} expandedQuestion={masterExpandedQuestion} setExpandedQuestion={setMasterExpandedQuestion} onReview={(index) => setReviewSession({ source: 'master', index })} actionLabel={t('继续训练')} action={continueTraining} secondaryLabel={t('退出挑战')} secondaryAction={exitMaster}/></div>}
    {master?.status === 'completed' && masterStats && <div className="overlay result-overlay"><div className="confetti" aria-hidden="true">{Array.from({ length: 28 }, (_, index) => <i key={index}/>)}</div><MasterResult locale={locale} title={t(master.mode === 'formal' ? '恭喜你成为图灵大师' : '恭喜完成图灵大师训练')} subtitle={t(master.mode === 'formal' ? '♛ 10 道挑战全部完成' : '练习模式 · 10 道挑战全部完成')} master={master} stats={masterStats} tab={masterTab} setTab={setMasterTab} expandedQuestion={masterExpandedQuestion} setExpandedQuestion={setMasterExpandedQuestion} onReview={(index) => setReviewSession({ source: 'master', index })} actionLabel={t('退出挑战')} action={exitMaster}/></div>}
    <LegalNotice locale={locale}/>
  </main>;
}

function Picker({ locale, bankPage, setBankPage, games, difficulty, setDifficulty, verifierCount, setVerifierCount, hashInput, setHashInput, message, loadChallenge, selectGame }: { locale: Locale; bankPage: number; setBankPage: (n: number) => void; games: BankGame[]; difficulty: number; setDifficulty: (n: number) => void; verifierCount: number; setVerifierCount: (n: number) => void; hashInput: string; setHashInput: (value: string) => void; message: '' | 'incomplete-code' | 'not-found'; loadChallenge: (kind: 'hash' | 'random') => void; selectGame: (game: Game) => void }) {
  const t = (text: string) => ui(locale, text);
  const messageText = message === 'incomplete-code' ? (locale === 'en' ? 'Enter the complete challenge code printed at the top of the card.' : '请输入题卡顶部的完整短代码。') : message === 'not-found' ? (locale === 'en' ? 'Puzzle not found. Enter a printable challenge code or a random share code such as R41 ABCD1234.' : '没有找到该题。可输入附件题代码，或随机题分享代码（例如 R41 ABCD1234）。') : '';
  return <section className="picker-panel" aria-label={t('选择挑战')}><div className="picker-copy"><p className="eyebrow">{t('挑战入口')}</p><h2>{t('420 题附件合集，以及无限离线随机题')}</h2><p>{t('输入打印题卡或朋友分享的随机题短代码即可载入；随机题会在本机即时生成，并通过唯一解校验。')}</p></div><div className="picker-controls"><label className="hash-field"><span>{t('题目短代码')}</span><input value={hashInput} onChange={(event) => setHashInput(event.target.value)} placeholder={locale === 'en' ? 'e.g. A41 AA5 or R41 ABCD1234' : '例如 A41 AA5 或 R41 ABCD1234'} /></label><button className="secondary-button" onClick={() => loadChallenge('hash')}>{t('载入题目')}</button><div className="select-row"><label><span>{t('验证器')}</span><select value={verifierCount} onChange={(event) => setVerifierCount(Number(event.target.value))}><option value={4}>{locale === 'en' ? '4 Verifiers' : '4 个'}</option><option value={5}>{locale === 'en' ? '5 Verifiers' : '5 个'}</option><option value={6}>{locale === 'en' ? '6 Verifiers' : '6 个'}</option></select></label><label className={`difficulty-control ${difficultyClasses[difficulty as DifficultyLevel]}`}><span>{t('难度')} <i>{difficultyText(locale, difficulty)}</i></span><select value={difficulty} onChange={(event) => setDifficulty(Number(event.target.value))}><option value={0}>{difficultyText(locale, 0)}</option><option value={1}>{difficultyText(locale, 1)}</option><option value={2}>{difficultyText(locale, 2)}</option></select></label><button className="random-button" onClick={() => loadChallenge('random')}>{t('随机生成')}</button></div>{messageText && <p className="form-message">{messageText}</p>}</div><div className="bank-browser"><div className="bank-browser-head"><div><strong>{t('附件题库')}</strong><span>{t('16 页 · 共 420 题 · 可离线载入')}</span></div><span>{locale === 'en' ? `Page ${bankPage}` : `第 ${bankPage} 页`}</span></div><div className="page-tabs">{Array.from({ length: 16 }, (_, index) => index + 1).map((page) => <button className={page === bankPage ? 'active' : ''} key={page} onClick={() => setBankPage(page)}>{page}</button>)}</div><div className="bank-grid">{games.map((bankGame) => { const level = difficultyOf(bankGame); const meta = { className: difficultyClasses[level], label: difficultyText(locale, level) }; return <button className={`difficulty-card ${meta.className}`} key={`${bankGame.page}-${bankGame.position}`} onClick={() => selectGame(bankGame)}><i className="difficulty-corner">{meta.label}</i><span>{String(bankGame.position).padStart(2, '0')}</span><strong>{bankGame.hash}</strong><small>{locale === 'en' ? `${bankGame.n} Verifiers` : `${bankGame.n} 个验证器`}</small></button>; })}</div></div></section>;
}

function LegalNotice({ locale }: { locale: Locale }) { return <footer className="site-footer"><span>{ui(locale, '此网页版汉化仅供学习交流 严禁用于任何商业途径')}</span><a href="https://www.scorpionmasque.com/en/turingmachine" target="_blank" rel="noreferrer">{ui(locale, 'Turing Machine 官网 ↗')}</a></footer>; }
function RoundResultGrid({ locale, record, verifierCount }: { locale: Locale; record: RoundRecord; verifierCount: number }) {
  const answers = new Map(record.answers.map((answer) => [answer.index, answer.pass]));
  return <div className="round-result-grid" aria-label={locale === 'en' ? `Verifier results for round ${record.round}` : `第 ${record.round} 轮图灵机结果`}>
    {Array.from({ length: 6 }, (_, index) => { const available = index < verifierCount; const pass = answers.get(index); const answered = pass !== undefined; const letter = String.fromCharCode(65 + index); const label = locale === 'en' ? (!available ? `${letter} is not used in this puzzle` : !answered ? `${letter} was not questioned this round` : `${letter} ${pass ? 'passed' : 'failed'}`) : (!available ? `${letter} 本题未使用` : !answered ? `${letter} 本轮未询问` : `${letter} ${pass ? '通过' : '未通过'}`); return <span className={`${answered ? pass ? 'yes' : 'no' : 'empty'} ${available ? '' : 'unavailable'}`} aria-label={label} key={index}>{answered ? pass ? '✓' : '✕' : ''}</span>; })}
  </div>;
}
function HistoryHeader({ verifierCount }: { verifierCount: number }) { return <div className="history-table-header" aria-hidden="true"><i className="history-shape history-blue"/><i className="history-shape history-yellow"/><i className="history-shape history-purple"/>{Array.from({ length: 6 }, (_, index) => <b className={index < verifierCount ? '' : 'unavailable'} key={index}>{String.fromCharCode(65 + index)}</b>)}</div>; }
function HistoryRound({ locale, record, verifierCount }: { locale: Locale; record: RoundRecord; verifierCount: number }) { return <article className="history-row" aria-label={locale === 'en' ? `Round ${record.round}, proposal ${record.guess.join(' ')}` : `第 ${record.round} 轮，方案 ${record.guess.join(' ')}`}><div className="plain-guess">{record.guess.map((digit, index) => <b key={index}>{digit}</b>)}</div><RoundResultGrid locale={locale} record={record} verifierCount={verifierCount}/></article>; }
function Notes({ locale, history, questions, verifierCount, deductionMarks, onToggleDeduction, emptyTitle = '开始第一次询问', emptyText = '每次回答都会自动记录在这里，方便你排除数字并锁定验证标准。' }: { locale: Locale; history: RoundRecord[]; questions: number; verifierCount: number; deductionMarks?: DeductionMarks; onToggleDeduction?: (colorIndex: number, digit: number) => void; emptyTitle?: string; emptyText?: string }) { const t = (text: string) => ui(locale, text); return <aside className="notes-panel"><div className="notes-top"><span>{t('推理记录')}</span><span>{locale === 'en' ? `${questions} questions` : `${questions} 次提问`}</span></div>{deductionMarks && onToggleDeduction && <section className="deduction-pad" aria-label={locale === 'en' ? 'Number elimination aid' : '数字排除辅助'}><div className="deduction-head"><strong>{t('数字排除')}</strong><span>{t('点击数字切换划线')}</span></div><div className="deduction-grid">{colors.map((color, colorIndex) => <div className={`deduction-column deduction-${color}`} key={color}><i className={`deduction-shape shape-${color}`} aria-hidden="true"/>{[5, 4, 3, 2, 1].map((digit) => { const marked = deductionMarks[colorIndex].includes(digit); return <button className={marked ? 'eliminated' : ''} aria-pressed={marked} aria-label={locale === 'en' ? `${colourText(locale, colorIndex)} number ${digit}, ${marked ? 'eliminated' : 'not eliminated'}` : `${colourText(locale, colorIndex)}数字 ${digit}${marked ? '，已排除' : '，未排除'}`} onClick={() => onToggleDeduction(colorIndex, digit)} key={digit}>{digit}</button>; })}</div>)}</div></section>}{history.length === 0 ? <div className="empty-note"><div className="mini-grid"><i/><i/><i/><i/><i/><i/></div><h3>{t(emptyTitle)}</h3><p>{t(emptyText)}</p></div> : <div className="history-list"><HistoryHeader verifierCount={verifierCount}/>{history.map((record) => <HistoryRound locale={locale} record={record} verifierCount={verifierCount} key={`${record.round}-${record.guess.join('')}`}/>)}</div>}<div className="tip"><span>!</span><p><strong>{t('记住')}</strong>{t('验证器回答的是标准，而不是最终密码本身。所有验证器都不可缺少。')}</p></div></aside>; }
function MasterReview({ locale, onChangeLocale, question, index, previousIndex, nextIndex, onNavigate, onBack }: { locale: Locale; onChangeLocale: (locale: Locale) => void; question: MasterRun['questions'][number]; index: number; previousIndex: number | null; nextIndex: number | null; onNavigate: (index: number) => void; onBack: () => void }) {
  const t = (text: string) => ui(locale, text);
  const meta = { className: difficultyClasses[question.difficulty], label: difficultyText(locale, question.difficulty) };
  const answer = solutionDigits(question.game);
  return <main className="master-review-page"><nav className="topbar"><a className="brand" href="#review-top" aria-label={locale === 'en' ? 'Turing Master review page' : '图灵大师复盘页'}><span className="brand-mark">T</span><BrandName locale={locale}/></a><div className="nav-actions review-nav"><button className="text-button" disabled={previousIndex === null} onClick={() => previousIndex !== null && onNavigate(previousIndex)}>← {locale === 'en' ? 'Previous' : '上一题'}</button><button className="text-button" disabled={nextIndex === null} onClick={() => nextIndex !== null && onNavigate(nextIndex)}>{locale === 'en' ? 'Next' : '下一题'} →</button><button className="master-button" onClick={onBack}>{locale === 'en' ? 'Return to Challenge Report' : '返回挑战战报'}</button><LanguageSwitch locale={locale} onChange={onChangeLocale}/></div></nav><section className="game-shell master-shell" id="review-top"><header className="game-heading"><div><p className="eyebrow">{locale === 'en' ? `Turing Master Review · Puzzle ${index + 1}` : `图灵大师复盘 · 第 ${index + 1} 题`}</p><h1>{t('回看已完成的推理')}</h1><p className="intro">{t('只读复盘不会重新计时，也不会改变成绩、挑战进度或每日资格。')}</p></div><div className={`challenge-code difficulty-code ${meta.className} master-clock`} aria-label={locale === 'en' ? `Review of puzzle ${index + 1}, ${meta.label} difficulty` : `第 ${index + 1} 题复盘，${meta.label}难度`}><i className="difficulty-corner">{meta.label}</i><span>TURING MASTER</span><strong>{locale === 'en' ? `PUZZLE ${index + 1} REVIEW` : `第 ${index + 1} 题复盘`}</strong><small className="difficulty-dots">{[0, 1, 2].map((dot) => <i className={dot <= question.difficulty ? 'filled' : 'empty'} key={dot}/>)}</small><em>{t('只读模式')}</em></div></header><div className="workspace"><section className="machine-panel review-machine" aria-labelledby="review-title"><div className="panel-title"><div><span className="step">01</span><h2 id="review-title">{t('本题最终密码')}</h2></div><span className="round-chip">{t('已完成')}</span></div><div className="digit-rack" aria-label={locale === 'en' ? `Correct code: ${answer.join(' ')}` : `正确密码为 ${answer.join(' ')}`}>{answer.map((digit, digitIndex) => <div className={`digit-card digit-${digitIndex + 1}`} key={digitIndex}><button disabled aria-hidden="true">⌃</button><strong>{digit}</strong><button disabled aria-hidden="true">⌄</button></div>)}</div><div className="round-rule"><span>{t('正确密码')}</span><strong>{answer.join('')}</strong><span>{locale === 'en' ? `${question.history?.length ?? 0} deduction rounds` : `${question.history?.length ?? 0} 轮推理记录`}</span></div><div className="panel-title verifier-heading"><div><span className="step">02</span><h2>{t('本题全部验证器')}</h2></div><span className="selection-count">A–{String.fromCharCode(64 + question.game.n)}</span></div><div className={`verifier-grid verifier-count-${question.game.n}`}>{question.game.ind.map((card, verifierIndex) => <div className="verifier-card review-verifier" key={verifierIndex}><span className="verifier-letter">{String.fromCharCode(65 + verifierIndex)}</span><span className="verifier-info"><small>{locale === 'en' ? `Criteria Card ${card} · Asked ${question.verifierUses?.[String(card)] ?? 0} times` : `标准卡 ${card} · 询问 ${question.verifierUses?.[String(card)] ?? 0} 次`}</small><strong>{locale === 'en' ? englishCardHints[card] : cardHints[card]}</strong><em>{locale === 'en' ? englishLawText[question.game.law[verifierIndex]] : lawText(question.game.law[verifierIndex])}</em></span><span className="check passed">✓</span></div>)}</div><button className="ask-button" disabled>{t('复盘模式不可提问')}</button><div className="submit-zone"><div><small>{t('本题已经完成')}</small><strong>{locale === 'en' ? `Correct Code ${answer.join('')}` : `正确密码 ${answer.join('')}`}</strong></div><button disabled>{t('已完成')}</button></div></section><ScratchPad locale={locale} value={question.scratch ?? ''} readOnly/><Notes locale={locale} history={question.history ?? []} questions={question.questions} verifierCount={question.game.n} emptyTitle="没有可回看的逐轮记录" emptyText="这是旧版本保存的挑战记录；题目、标准卡和隐藏答案仍可正常复盘。"/></div></section><LegalNotice locale={locale}/></main>;
}
function RulesMenu({ locale, open, onToggle, onOpenHistory, onOpenRules, onOpenReference }: { locale: Locale; open: boolean; onToggle: () => void; onOpenHistory: () => void; onOpenRules: () => void; onOpenReference: () => void }) { const t = (text: string) => ui(locale, text); return <div className="rules-menu-wrap"><button className="rules-button" onClick={onToggle} aria-expanded={open} aria-haspopup="menu">{t('说明')} <i className="rules-chevron" aria-hidden="true" /></button>{open && <div className="rules-menu" role="menu"><button role="menuitem" onClick={onOpenHistory}><span><strong>{t('历史记录')}</strong><small>{t('查看本机保存的玩题记录')}</small></span><em>→</em></button><button role="menuitem" onClick={onOpenRules}><span><strong>{t('规则介绍')}</strong><small>{t('查看完整网页版规则书')}</small></span><em>→</em></button><button role="menuitem" onClick={onOpenReference}><span><strong>{t('标准卡速查')}</strong><small>{t('查看全部 48 张标准卡')}</small></span><em>→</em></button></div>}</div>; }
function LanguageSwitch({ locale, onChange }: { locale: Locale; onChange: (locale: Locale) => void }) {
  return <div className="language-switch" role="group" aria-label={locale === 'en' ? 'Language switch' : '语言切换'}>
    <button type="button" className={locale === 'zh' ? 'active' : ''} aria-pressed={locale === 'zh'} onClick={() => onChange('zh')}>中文</button>
    <button type="button" className={locale === 'en' ? 'active' : ''} aria-pressed={locale === 'en'} onClick={() => onChange('en')}>EN</button>
  </div>;
}
function RuleBook({ locale, onClose, onBack }: { locale: Locale; onClose: () => void; onBack: () => void }) {
  const [page, setPage] = useState(0);
  const t = (text: string) => ui(locale, text);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') setPage((current) => Math.max(0, current - 1));
      if (event.key === 'ArrowRight') setPage((current) => Math.min(ruleSlides.length - 1, current + 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return <div className="overlay rule-book-overlay"><section className="rule-book" role="dialog" aria-modal="true" aria-label={locale === 'en' ? `${t('规则介绍')}, page ${page + 1} of ${ruleSlides.length}` : `规则介绍，第 ${page + 1} 页，共 ${ruleSlides.length} 页`}>
    <button className="rule-book-back" onClick={onBack}>← {t('返回')}</button>
    <button className="rule-book-close" onClick={onClose} aria-label={locale === 'en' ? 'Close the rulebook' : '关闭规则介绍'}><i aria-hidden="true"/></button>
    <button className="rule-book-nav rule-book-prev" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} aria-label={locale === 'en' ? 'Previous page' : '上一页'}><i aria-hidden="true"/></button>
    <figure><img src={ruleSlides[page]} alt={locale === 'en' ? `Turing Machine rulebook page ${page + 1}` : `图灵机规则介绍第 ${page + 1} 页`}/></figure>
    <button className="rule-book-nav rule-book-next" onClick={() => setPage((current) => Math.min(ruleSlides.length - 1, current + 1))} disabled={page === ruleSlides.length - 1} aria-label={locale === 'en' ? 'Next page' : '下一页'}><i aria-hidden="true"/></button>
  </section></div>;
}
function VerifierText({ locale, text }: { locale: Locale; text: string }) { return <>{text.split(/(蓝色|黄色|紫色|Blue|Yellow|Purple|blue|yellow|purple)/g).map((part, index) => /^(蓝色|Blue|blue)$/.test(part) ? <i key={index} className="reference-color-shape reference-blue" role="img" aria-label={locale === 'en' ? 'blue triangle' : '蓝色三角形'} /> : /^(黄色|Yellow|yellow)$/.test(part) ? <i key={index} className="reference-color-shape reference-yellow" role="img" aria-label={locale === 'en' ? 'yellow square' : '黄色正方形'} /> : /^(紫色|Purple|purple)$/.test(part) ? <i key={index} className="reference-color-shape reference-purple" role="img" aria-label={locale === 'en' ? 'purple circle' : '紫色圆形'} /> : part)}</>; }
function VerifierReference({ locale, onClose }: { locale: Locale; onClose: () => void }) {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  return <div className="overlay result-overlay"><section className="verifier-reference" role="dialog" aria-modal="true" aria-labelledby="verifier-reference-title">
    <div className="reference-head"><div><h2 id="verifier-reference-title">{ui(locale, '标准卡速查')}</h2><p>{ui(locale, '全部 48 张标准卡的问题、可能标准与规则书说明。速查内容是公开信息，不会显示当前题目的隐藏答案。')}</p></div><button onClick={onClose} aria-label={locale === 'en' ? 'Close Criteria Card reference' : '关闭标准卡速查'}>×</button></div>
    <div className="reference-scroll"><div className="reference-grid">{verifierReference.map(({ card, laws }) => {
      const expanded = expandedCard === card;
      const guide = locale === 'en' ? englishVerifierGuide[card] : verifierGuide[card];
      const question = locale === 'en' ? englishCardHints[card] : cardHints[card];
      const detailId = `verifier-guide-${card}`;
      return <article className={expanded ? 'expanded' : ''} key={card}>
        <button className="reference-card-toggle" type="button" aria-expanded={expanded} aria-controls={detailId} onClick={() => setExpandedCard((current) => current === card ? null : card)}>
          <span className="reference-card-number">{String(card).padStart(2, '0')}</span>
          <span className="reference-card-copy"><small>{locale === 'en' ? `Criteria Card ${card}` : `标准卡 ${card}`}</small><strong><VerifierText locale={locale} text={question} /></strong><span className="reference-laws">{laws.length ? laws.map((law, index) => <span className="reference-law" key={law}><VerifierText locale={locale} text={locale === 'en' ? englishLawText[law] ?? `Hidden criterion ${law}` : lawText(law)} />{index < laws.length - 1 && <b aria-hidden="true">·</b>}</span>) : ui(locale, '暂无标准资料')}</span></span>
          <i className="reference-card-chevron" aria-hidden="true" />
        </button>
        {expanded && <div className="reference-detail" id={detailId} role="region" aria-label={locale === 'en' ? `Details for Criteria Card ${card}` : `标准卡 ${card} 具体介绍`}><strong>{ui(locale, '具体作用')}</strong><p><VerifierText locale={locale} text={guide.description} /></p>{guide.warning && <aside><b>{ui(locale, '注意')}</b><span><VerifierText locale={locale} text={guide.warning} /></span></aside>}</div>}
      </article>;
    })}</div></div>
  </section></div>;
}
function InfoHistory({ locale, entries, locked, onOpen, onMerge, onClose }: { locale: Locale; entries: PuzzleHistoryEntry[]; locked: boolean; onOpen: (entry: PuzzleHistoryEntry) => void; onMerge: (incoming: PuzzleHistoryEntry[]) => void; onClose: () => void }) {
  const t = (text: string) => ui(locale, text);
  const [tab, setTab] = useState<HistoryTab>(0);
  const [transfer, setTransfer] = useState<{ kind: '' | 'imported' | 'empty' | 'failed'; count: number }>({ kind: '', count: 0 });
  const sorted = [...entries].sort((a, b) => b.playedAt - a.playedAt);
  const pick = (target: HistoryTab) => sorted.filter((entry) => target === 'master' ? entry.source === 'master' : entry.source !== 'master' && entry.difficulty === target);
  const visible = pick(tab);
  const entryTitle = (entry: PuzzleHistoryEntry) => entry.source === 'master'
    ? `${entry.dateKey ?? ''} · ${locale === 'en' ? `Puzzle ${(entry.masterIndex ?? 0) + 1}/10` : `第 ${(entry.masterIndex ?? 0) + 1}/10 题`}`
    : entry.hash;
  const entryMeta = (entry: PuzzleHistoryEntry) => entry.source === 'master'
    ? `${entry.mode === 'practice' ? t('练习挑战') : t('正式挑战')} · ${t('玩过时间')} ${formatPlayedAt(entry.playedAt)}`
    : `${t(entry.source === 'random' ? '随机生成题' : '默认题库')} · ${t('玩过时间')} ${formatPlayedAt(entry.playedAt)}`;
  const exportHistory = () => {
    const payload = { app: 'turing-machine-solo', kind: 'tm-puzzle-history', version: 1, exportedAt: new Date().toISOString(), count: entries.length, entries };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `turing-machine-history-${chinaDateKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const importHistory = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const list = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' && Array.isArray((parsed as { entries?: unknown }).entries) ? (parsed as { entries: unknown[] }).entries : [];
      const incoming = list.map(normalizeHistoryEntry).filter((entry): entry is PuzzleHistoryEntry => Boolean(entry));
      if (!incoming.length) { setTransfer({ kind: 'empty', count: 0 }); return; }
      onMerge(incoming);
      setTransfer({ kind: 'imported', count: incoming.length });
    } catch { setTransfer({ kind: 'failed', count: 0 }); }
  };
  const transferMessage = transfer.kind === 'imported'
    ? (locale === 'en' ? `Imported ${transfer.count} puzzles.` : `已导入 ${transfer.count} 条记录。`)
    : transfer.kind === 'empty' ? t('文件中没有可导入的历史记录。') : transfer.kind === 'failed' ? t('导入失败，请选择本页面导出的 JSON 文件。') : '';
  return <div className="overlay result-overlay"><section className="verifier-reference info-history" role="dialog" aria-modal="true" aria-labelledby="info-history-title">
    <div className="reference-head"><div><h2 id="info-history-title">{t('历史记录')}</h2><p>{t('本机保存的每一道玩过的题目：默认题库、随机生成题与大师挑战。记录不会上传网络。')}</p></div><button onClick={onClose} aria-label={locale === 'en' ? 'Close history' : '关闭历史记录'}>×</button></div>
    <div className="history-tabs" role="group" aria-label={t('历史记录分类')}>{([0, 1, 2] as DifficultyLevel[]).map((level) => <button type="button" aria-pressed={tab === level} className={tab === level ? 'active' : ''} key={level} onClick={() => setTab(level)}>{difficultyText(locale, level)}<span>{pick(level).length}</span></button>)}<button type="button" aria-pressed={tab === 'master'} className={tab === 'master' ? 'active' : ''} onClick={() => setTab('master')}>{t('大师挑战')}<span>{pick('master').length}</span></button></div>
    <div className="reference-scroll">{locked && <p className="history-lock">{t('大师挑战进行中，退出挑战后才能重新打开其他题目。')}</p>}{visible.length ? <div className={`history-records${tab === 'master' ? ' master' : ''}`}>{visible.map((entry) => <article className="history-record" key={entry.id}>
      <div className="history-record-head"><strong>{entryTitle(entry)}</strong><span className={`history-status ${entry.solved ? 'completed' : 'playing'}`}>{t(entry.solved ? '已解开' : '未解开')}</span></div>
      <small className="history-record-meta">{entryMeta(entry)}</small>
      {entry.source === 'master' && <small className="history-record-code">{locale === 'en' ? `Code ${entry.hash}` : `短代码 ${entry.hash}`}</small>}
      <button className="history-open" disabled={locked} onClick={() => onOpen(entry)}>{t('重新打开此题')}</button>
    </article>)}</div> : <div className="info-empty"><div className="mini-grid"><i/><i/><i/><i/><i/><i/></div><h3>{entries.length ? t('该分类暂无记录') : t('暂无历史记录')}</h3><p>{entries.length ? t('切换到其他分类，或先去玩一道这个难度的题目。') : t('开始玩题后，题目会自动记录在本机浏览器，并显示在这里。')}</p></div>}</div>
    <div className="history-data">
      <div className="history-data-actions"><button type="button" className="history-export" onClick={exportHistory}>{t('导出数据')}</button><label className="history-import">{t('导入数据')}<input type="file" accept="application/json,.json" onChange={importHistory}/></label></div>
      {transferMessage && <p className={`history-data-message ${transfer.kind}`}>{transferMessage}</p>}
    </div>
  </section></div>;
}
function LawReveal({ locale, game }: { locale: Locale; game: Game }) { return <div className="law-reveal">{game.law.map((law, index) => <div key={`${law}-${index}`}><span>{String.fromCharCode(65 + index)}</span><p><small>{locale === 'en' ? `Criteria Card ${game.ind[index]}` : `标准卡 ${game.ind[index]}`}</small><strong>{locale === 'en' ? englishLawText[law] ?? `Hidden criterion ${law}` : lawText(law)}</strong></p></div>)}</div>; }
function topUsage(record: Record<string, number>) { const values = Object.entries(record); if (!values.length) return null; const count = Math.max(...values.map(([, value]) => value)); return { items: values.filter(([, value]) => value === count).map(([key]) => key).sort((a, b) => Number(a) - Number(b)), count }; }
function buildMasterStats(master: MasterRun, now: number) { const entries = master.questions.map((question, index) => ({ question, index, elapsed: questionElapsed(question, now) })); const completed = entries.filter((entry) => entry.question.completed); const usable = completed.length ? completed : entries; const by = (compare: (a: typeof usable[number], b: typeof usable[number]) => number) => [...usable].sort(compare)[0]; const bestByDifficulty = [0, 1, 2].map((difficulty) => entries.filter((entry) => entry.question.difficulty === difficulty && entry.question.completed).sort((a, b) => a.elapsed - b.elapsed)[0] ?? null); const usage: Record<string, number> = {}; const guessUsage: Record<string, number> = {}; const passedUsage: Record<string, number> = {}; const failedUsage: Record<string, number> = {}; entries.forEach((entry) => { Object.entries(entry.question.verifierUses ?? {}).forEach(([card, count]) => { usage[card] = (usage[card] ?? 0) + count; }); Object.entries(entry.question.guessUses ?? {}).forEach(([guess, count]) => { guessUsage[guess] = (guessUsage[guess] ?? 0) + count; }); (entry.question.history ?? []).forEach((record) => record.answers.forEach((answer) => { const card = String(entry.question.game.ind[answer.index]); const target = answer.pass ? passedUsage : failedUsage; target[card] = (target[card] ?? 0) + 1; })); }); return { entries, total: runElapsed(master, now), longest: by((a, b) => b.elapsed - a.elapsed || a.index - b.index), mostArrangements: by((a, b) => arrangementCount(b.question) - arrangementCount(a.question) || a.index - b.index), bestByDifficulty, mostUsedCard: Object.entries(usage).sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))[0] ?? null, mostUsedGuesses: topUsage(guessUsage), mostPassedCards: topUsage(passedUsage), mostFailedCards: topUsage(failedUsage) }; }
function MasterResult({ locale, title, subtitle, master, stats, tab, setTab, expandedQuestion, setExpandedQuestion, onReview, actionLabel, action, secondaryLabel, secondaryAction }: { locale: Locale; title: string; subtitle: string; master: MasterRun; stats: ReturnType<typeof buildMasterStats>; tab: MasterTab; setTab: (tab: MasterTab) => void; expandedQuestion: number | null; setExpandedQuestion: (index: number | null) => void; onReview: (index: number) => void; actionLabel: string; action: () => void; secondaryLabel?: string; secondaryAction?: () => void }) {
  const t = (text: string) => ui(locale, text);
  const hint = (card: number) => locale === 'en' ? englishCardHints[card] ?? 'Unknown question' : cardHints[card] ?? '未知问题';
  const label = (entry: typeof stats.entries[number] | null | undefined) => entry ? (locale === 'en' ? `Puzzle ${entry.index + 1} · ${difficultyText(locale, entry.question.difficulty)} · ${formatDuration(entry.elapsed)}` : `第 ${entry.index + 1} 题 · ${difficultyText(locale, entry.question.difficulty)} · ${formatDuration(entry.elapsed)}`) : t('尚无完成题目');
  const arrangementLabel = (entry: typeof stats.entries[number] | null | undefined) => entry ? (locale === 'en' ? `Puzzle ${entry.index + 1} · ${difficultyText(locale, entry.question.difficulty)} · ${arrangementCount(entry.question)} proposals${usesLegacyArrangementEstimate(entry.question) ? ' (estimated from old record)' : ''}` : `第 ${entry.index + 1} 题 · ${difficultyText(locale, entry.question.difficulty)} · ${arrangementCount(entry.question)} 次排列${usesLegacyArrangementEstimate(entry.question) ? '（旧记录估算）' : ''}`) : t('尚无完成题目');
  const cardLeaders = (leader: ReturnType<typeof topUsage>) => leader ? (locale === 'en' ? `${leader.items.map((card) => `Criteria Card ${card} “${hint(Number(card))}”`).join(', ')} · ${leader.count} times` : `${leader.items.map((card) => `标准卡 ${card}「${hint(Number(card))}」`).join('、')} · ${leader.count} 次`) : t('尚无记录');
  return <section className="result-card master-result" role="dialog" aria-modal="true"><div className="crown">♛</div><p className="eyebrow">TURING MASTER</p><h2>{title}</h2><p className="performance">{subtitle}<br/>{locale === 'en' ? 'Active solving time' : '有效解题时间'} <strong>{formatDuration(stats.total)}</strong> · {locale === 'en' ? 'Completed' : '已完成'} <strong>{master.questions.filter((q) => q.completed).length}/10</strong> {locale === 'en' ? 'puzzles' : '题'}</p><div className="result-tabs"><button className={tab === 'analysis' ? 'active' : ''} onClick={() => setTab('analysis')}>{t('推理统计')}</button><button className={tab === 'questions' ? 'active' : ''} onClick={() => setTab('questions')}>{t('逐题数据')}</button></div>{tab === 'analysis' && <div className="master-summary"><p>{t('用时最长：')}<strong>{label(stats.longest)}</strong></p><p>{t('排列最多：')}<strong>{arrangementLabel(stats.mostArrangements)}</strong></p><p>{t('玩家最常使用的排列：')}<strong>{stats.mostUsedGuesses ? (locale === 'en' ? `${stats.mostUsedGuesses.items.join(', ')} · Questioned ${stats.mostUsedGuesses.count} times` : `${stats.mostUsedGuesses.items.join('、')} · 共询问 ${stats.mostUsedGuesses.count} 次`) : t('尚未询问')}</strong></p><p>{t('最常询问标准卡：')}<strong>{stats.mostUsedCard ? (locale === 'en' ? `Criteria Card ${stats.mostUsedCard[0]} “${hint(Number(stats.mostUsedCard[0]))}” · Questioned ${stats.mostUsedCard[1]} times` : `标准卡 ${stats.mostUsedCard[0]}「${hint(Number(stats.mostUsedCard[0]))}」 · 共询问 ${stats.mostUsedCard[1]} 次`) : t('尚未询问')}</strong></p><p>{t('答对最多的标准卡：')}<strong>{cardLeaders(stats.mostPassedCards)}</strong></p><p>{t('答错最多的标准卡：')}<strong>{cardLeaders(stats.mostFailedCards)}</strong></p></div>}{tab === 'questions' && <div className="master-question-list">{stats.entries.map((entry) => { const expanded = expandedQuestion === entry.index; const fastest = stats.bestByDifficulty.some((best) => best?.index === entry.index); return <article key={entry.index} className={`${entry.question.completed ? 'done' : ''} ${expanded ? 'expanded' : ''}`}><button className="master-question-summary" onClick={() => setExpandedQuestion(expanded ? null : entry.index)} aria-expanded={expanded}><span>{entry.index + 1}</span><p><strong>{difficultyText(locale, entry.question.difficulty)} {fastest && <b className="fastest-star" title={locale === 'en' ? 'Fastest at this difficulty' : '本难度最快'} aria-label={locale === 'en' ? 'Fastest at this difficulty' : '本难度最快'}>★</b>}</strong><small>{t(entry.question.completed ? '已完成' : '未完成')} · {formatDuration(entry.elapsed)}</small></p><em>{locale === 'en' ? `${entry.question.questions} questions / ${arrangementCount(entry.question)} proposals${usesLegacyArrangementEstimate(entry.question) ? ' (estimated)' : ''} / ${entry.question.submissions} submissions` : `${entry.question.questions} 问 / ${arrangementCount(entry.question)} 次排列${usesLegacyArrangementEstimate(entry.question) ? '（估算）' : ''} / ${entry.question.submissions} 次提交`}</em><i>{t(expanded ? '收起' : '展开')}</i></button>{expanded && <div className="master-question-detail"><div className="question-law-list">{entry.question.game.ind.map((card, verifierIndex) => <div key={verifierIndex}><span>{String.fromCharCode(65 + verifierIndex)}</span><p><small>{locale === 'en' ? `Criteria Card ${card} · Asked ${entry.question.verifierUses?.[String(card)] ?? 0} times` : `标准卡 ${card} · 询问 ${entry.question.verifierUses?.[String(card)] ?? 0} 次`}</small><strong>{hint(card)}</strong><em>{locale === 'en' ? `Criterion: ${englishLawText[entry.question.game.law[verifierIndex]] ?? `Hidden criterion ${entry.question.game.law[verifierIndex]}`}` : `答案：${lawText(entry.question.game.law[verifierIndex])}`}</em></p></div>)}</div>{entry.question.completed && <button className="review-question-button" onClick={() => onReview(entry.index)}>{t('复盘本题 →')}</button>}{entry.question.completed && !(entry.question.history?.length) && <small className="legacy-history-note">{t('旧记录未保存逐轮详情，但仍可查看题目与隐藏标准。')}</small>}</div>}</article>; })}</div>}<div className="result-actions">{secondaryLabel && secondaryAction && <button className="secondary-button" onClick={secondaryAction}>{secondaryLabel}</button>}<button className="master-start" onClick={action}>{actionLabel}</button></div></section>;
}
