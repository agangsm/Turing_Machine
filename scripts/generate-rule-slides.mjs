import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const projectDir = process.cwd();
const sourceDir = resolve(projectDir, '..', 'tmp', 'rule-book-final', 'native-slides-v3');
const generatedDir = resolve(projectDir, 'app', 'data');
const outputPath = resolve(generatedDir, 'rule-slides.ts');

const slides = [];
for (let page = 1; page <= 16; page += 1) {
  const png = await readFile(resolve(sourceDir, `幻灯片${page}.PNG`));
  const webp = await sharp(png).webp({ lossless: true, effort: 6 }).toBuffer();
  slides.push(`data:image/webp;base64,${webp.toString('base64')}`);
}

await mkdir(generatedDir, { recursive: true });
await writeFile(outputPath, `// Generated from Turing_Machine二版_修订版.pptx.\nexport const ruleSlides = ${JSON.stringify(slides)} as const;\n`, 'utf8');
console.log(outputPath);
