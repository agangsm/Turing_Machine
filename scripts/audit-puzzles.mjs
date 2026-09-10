import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { analyzeGame, gameFromShareCode, generateGame } from '../app/lib/generator.ts';
import { createDailyMasterRun } from '../app/lib/master.ts';
import { evaluateLaw, lawText } from '../app/lib/turing.ts';

const projectDir = process.cwd();
const bank = JSON.parse(await readFile(resolve(projectDir, 'app/data/challenge-bank.json'), 'utf8'));
const stressCount = Math.max(0, Number(process.argv.find((arg) => arg.startsWith('--stress='))?.split('=')[1] ?? 10000));
const checkOfficial = process.argv.includes('--official');
const failures = [];

for (const game of bank) {
  const audit = analyzeGame(game);
  if (!audit.unique || !audit.expectedPasses || !audit.everyOtherCodeFails || !audit.indispensable) {
    failures.push({ hash: game.hash, code: game.code, solutions: audit.solutions.map((code) => code.join('')), expectedPasses: audit.expectedPasses, everyOtherCodeFails: audit.everyOtherCodeFails, indispensable: audit.indispensable });
  }
}

const focus = bank.find((game) => game.hash.replaceAll(' ', '') === 'C63EVRC');
if (!focus) throw new Error('C63 EVR C not found.');
const focusAudit = analyzeGame(focus);
const focusCriteria = focus.law.map((law, index) => `${String.fromCharCode(65 + index)}: 卡 ${focus.ind[index]} / ${lawText(law)} / ${evaluateLaw(law, focusAudit.expected) ? '通过' : '失败'}`);

let randomFailures = 0;
let shareCodeFailures = 0;
const masterRun = createDailyMasterRun('2026-08-27', 'formal', bank, 0);
const masterShapeFailures = Number(masterRun.questions.length !== 10)
  + Number(JSON.stringify(masterRun.questions.map((question) => question.difficulty)) !== JSON.stringify([0, 0, 1, 1, 1, 1, 2, 2, 2, 2]));
const masterLogicFailures = masterRun.questions.filter((question) => {
  const audit = analyzeGame(question.game);
  return !audit.unique || !audit.expectedPasses || !audit.everyOtherCodeFails || !audit.indispensable;
}).length;
const randomDistinct = new Set();
for (let index = 0; index < stressCount; index += 1) {
  const n = 4 + (index % 3);
  const difficulty = Math.floor(index / 3) % 3;
  const game = generateGame(n, difficulty, bank);
  const audit = analyzeGame(game);
  if (!audit.unique || !audit.expectedPasses || !audit.everyOtherCodeFails || !audit.indispensable) randomFailures += 1;
  const restored = gameFromShareCode(game.hash, bank);
  if (!restored || ['n', 'code', 'ind', 'law', 'crypt', 'color'].some((field) => JSON.stringify(restored[field]) !== JSON.stringify(game[field]))) shareCodeFailures += 1;
  randomDistinct.add(`${game.n}|${game.code}|${game.ind.join(',')}|${game.law.join(',')}`);
}

let officialMismatches = [];
if (checkOfficial) {
  const fetchOne = async (game) => {
    const hash = game.hash.replace(/[^a-z0-9]/gi, '').toUpperCase();
    const url = `https://turingmachine.info/api/api.php?uuid=${crypto.randomUUID().replaceAll('-', '')}&h=${hash}`;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(url, { headers: { Referer: 'https://www.turingmachine.info/', Origin: 'https://www.turingmachine.info', 'User-Agent': 'Mozilla/5.0 TuringMachineAudit/1.0' } });
        const data = await response.json();
        if (!response.ok || data.status !== 'ok') throw new Error(`HTTP ${response.status}`);
        const fields = ['n', 'code', 'par', 'ind', 'law', 'crypt', 'color'];
        const mismatch = fields.filter((field) => JSON.stringify(data[field]) !== JSON.stringify(game[field]));
        return mismatch.length ? { hash: game.hash, fields: mismatch, local: Object.fromEntries(mismatch.map((field) => [field, game[field]])), official: Object.fromEntries(mismatch.map((field) => [field, data[field]])) } : null;
      } catch (error) { lastError = error; }
    }
    return { hash: game.hash, error: String(lastError) };
  };
  for (let start = 0; start < bank.length; start += 12) {
    const results = await Promise.all(bank.slice(start, start + 12).map(fetchOne));
    officialMismatches.push(...results.filter(Boolean));
  }
}

const lines = [
  'Turing Machine 离线版逻辑核验报告',
  `固定题数量: ${bank.length}`,
  `固定题唯一解失败: ${failures.length}`,
  `随机题压力测试: ${stressCount}`,
  `随机题逻辑失败: ${randomFailures}`,
  `随机题分享代码复现失败: ${shareCodeFailures}`,
  `图灵大师题组结构失败: ${masterShapeFailures}`,
  `图灵大师题目逻辑失败: ${masterLogicFailures}`,
  `随机题不同结构数: ${randomDistinct.size}`,
  `官方 API 字段不一致/请求失败: ${checkOfficial ? officialMismatches.length : '未执行'}`,
  '',
  '重点题 C63 EVR C',
  `题库答案: ${focus.code}`,
  `满足全部标准的组合: ${focusAudit.solutions.map((code) => code.join('')).join(', ')}`,
  `其余 124 个组合至少失败一项: ${focusAudit.everyOtherCodeFails ? '是' : '否'}`,
  `六个验证器均不可缺少: ${focusAudit.indispensable ? '是' : '否'}`,
  ...focusCriteria,
];
if (failures.length) lines.push('', '固定题失败详情', JSON.stringify(failures, null, 2));
if (officialMismatches.length) lines.push('', '官方 API 差异详情', JSON.stringify(officialMismatches, null, 2));
const reportPath = resolve(projectDir, '..', 'Turing_Machine_核验报告.txt');
await writeFile(reportPath, lines.join('\n'), 'utf8');
console.log(lines.join('\n'));
if (failures.length || randomFailures || shareCodeFailures || masterShapeFailures || masterLogicFailures || officialMismatches.length) process.exitCode = 1;
