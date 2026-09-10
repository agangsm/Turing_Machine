import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectDir = process.cwd();
const inputPath = resolve(projectDir, 'public', 'Turing_Machine_Rulebook_EN.pdf');
const outputPath = resolve(projectDir, 'app', 'data', 'rulebook-en-pdf.ts');
const pdf = await readFile(inputPath);

await writeFile(
  outputPath,
  `// Generated from the official English PDF rulebook.\nexport const englishRulebookPdfBase64 = '${pdf.toString('base64')}';\n`,
  'utf8',
);

console.log(outputPath);
