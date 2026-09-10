import { readFile, writeFile } from 'node:fs/promises';

const path = './app/data/challenge-bank.json';
const bank = JSON.parse(await readFile(path, 'utf8'));
const repairs = {
  'A4A 000': { hash:'A4A O00', n:4, code:423, par:5, ind:[5,8,13,15], law:[34,40,97,113], crypt:[758,206,795,661], color:0 },
  'A47 E00': { hash:'A47 E0O', n:4, code:553, par:5, ind:[3,6,9,11], law:[21,38,47,89], crypt:[346,532,782,737], color:0 },
  'A43 006': { hash:'A43 0O6', n:4, code:331, par:5, ind:[3,7,11,14], law:[8,39,89,118], crypt:[464,657,739,325], color:2 },
  'A49 024': { hash:'A49 O24', n:4, code:231, par:6, ind:[4,7,8,15], law:[29,39,41,114], crypt:[670,654,356,329], color:0 },
  'B4D 15K': { hash:'B4D I5K', n:4, code:222, par:5, ind:[11,16,19,21], law:[89,131,137,81], crypt:[737,640,233,497], color:0 },
  'A51 KO0 R': { hash:'A51 KOO R', n:5, code:354, par:6, ind:[3,7,9,12,15], law:[21,36,47,96,114], crypt:[662,610,216,399,684], color:3 },
  'A52 23J 1': { hash:'A52 23J I', n:5, code:225, par:7, ind:[3,9,11,15,17], law:[28,46,89,115,87], crypt:[390,648,739,611,625], color:2 },
  'A5V 305': { hash:'A5V 3O5', n:5, code:143, par:6, ind:[4,7,8,13,14], law:[9,39,41,95,116], crypt:[577,355,653,386,418], color:1 },
  'B52 KW5': { hash:'B52 KW5 O', n:5, code:153, par:6, ind:[7,12,15,16,19], law:[39,96,114,132,100], crypt:[654,614,329,503,751], color:0 },
  'B5S 060': { hash:'B5S O6O', n:5, code:533, par:7, ind:[3,12,17,19,21], law:[8,93,85,136,82], crypt:[462,695,525,315,339], color:0 },
  'B65 212 E': { hash:'B65 2I2 E', n:6, code:532, par:8, ind:[4,5,9,18,19,22], law:[29,37,47,55,136,134], crypt:[677,580,785,223,317,282], color:2 },
  'B64 AX0 1': { hash:'B64 AXO 1', n:6, code:452, par:8, ind:[3,5,10,14,16,19], law:[21,34,50,118,131,136], crypt:[664,252,635,694,374,699], color:1 },
  'B63 Y15 R': { hash:'B63 YI5 R', n:6, code:524, par:8, ind:[2,7,8,14,17,21], law:[18,36,40,117,87,81], crypt:[585,610,790,718,393,518], color:3 },
  'B63 820 0': { hash:'B63 82O 0', n:6, code:235, par:8, ind:[3,5,12,18,19,21], law:[8,34,96,55,137,81], crypt:[462,758,614,220,233,497], color:0 },
};

for (const [oldHash, repair] of Object.entries(repairs)) {
  const game = bank.find((item) => item.hash === oldHash);
  if (!game) throw new Error(`Missing repair target: ${oldHash}`);
  Object.assign(game, repair);
}

await writeFile(path, `${JSON.stringify(bank)}\n`, 'utf8');
console.log(`Repaired ${Object.keys(repairs).length} challenge records.`);
