import { readFile } from 'node:fs/promises';

const bank = JSON.parse(await readFile('./app/data/challenge-bank.json', 'utf8'));
const targets = [
  { localHash:'A4A 000', printed:'A4A OOO', ind:[5,8,13,15], crypt:[758,206,795,661] },
  { localHash:'A47 E00', printed:'A47 EOO', ind:[3,6,9,11], crypt:[346,532,782,737] },
  { localHash:'A43 006', printed:'A43 OO6', ind:[3,7,11,14], crypt:[464,657,739,325] },
  { localHash:'A49 024', printed:'A49 O24', ind:[4,7,8,15], crypt:[670,654,356,329] },
  { localHash:'B4D 15K', printed:'B4D I5K', ind:[11,16,19,21], crypt:[737,640,233,497] },
  { localHash:'A51 KO0 R', printed:'A51 KOO R', ind:[3,7,9,12,15], crypt:[662,610,216,399,684] },
  { localHash:'A52 23J 1', printed:'A52 23J I', ind:[3,9,11,15,17], crypt:[390,648,739,611,625] },
  { localHash:'A5V 305', printed:'A5V 3O5', ind:[4,7,8,13,14], crypt:[577,355,653,386,418] },
  { localHash:'B52 KW5', printed:'B52 KW5 O', ind:[7,12,15,16,19], crypt:[654,614,329,503,751] },
  { localHash:'B5S 060', printed:'B5S O6O', ind:[3,12,17,19,21], crypt:[462,695,525,315,339] },
  { localHash:'B65 212 E', printed:'B65 2I2E', ind:[4,5,9,18,19,22], crypt:[677,580,785,223,317,282] },
  { localHash:'B64 AX0 1', printed:'B64 AXOI', ind:[3,5,10,14,16,19], crypt:[664,252,635,694,374,699] },
  { localHash:'B63 Y15 R', printed:'B63 YI5R', ind:[2,7,8,14,17,21], crypt:[585,610,790,718,393,518] },
  { localHash:'B63 820 0', printed:'B63 82OO', ind:[3,5,12,18,19,21], crypt:[462,758,614,220,233,497] },
];
const swaps = { '0':['0','O'], O:['O','0'], '1':['1','I'], I:['I','1'], '2':['2','Z'], Z:['Z','2'], '5':['5','S'], S:['S','5'], '8':['8','B'] };

const candidatesFor = (hash) => {
  const chars = hash.replace(/[^A-Z0-9]/g, '').split('');
  let values = [''];
  chars.forEach((char, index) => { const choices = index === 0 ? [char] : (swaps[char] ?? [char]); values = values.flatMap((value) => choices.map((choice) => value + choice)); });
  return [...new Set(values)];
};
const matches = (data, target) => data?.status === 'ok' && JSON.stringify(data.ind) === JSON.stringify(target.ind) && JSON.stringify(data.crypt) === JSON.stringify(target.crypt);
const fetchCandidate = async (hash) => {
  try {
    const response = await fetch(`https://turingmachine.info/api/api.php?uuid=${crypto.randomUUID().replaceAll('-', '')}&h=${hash}`, { headers: { Referer:'https://www.turingmachine.info/', Origin:'https://www.turingmachine.info', 'User-Agent':'Mozilla/5.0 TuringMachineHashResolver/1.0' } });
    return await response.json();
  } catch { return null; }
};

for (const target of targets) {
  const game = bank.find((item) => item.hash === target.localHash);
  if (!game) throw new Error(`Missing ${target.localHash}`);
  const candidates = candidatesFor(target.printed);
  let found = null;
  let official = null;
  for (let start = 0; start < candidates.length && !found; start += 12) {
    const batch = candidates.slice(start, start + 12);
    const results = await Promise.all(batch.map(fetchCandidate));
    const index = results.findIndex((data) => matches(data, target));
    if (index >= 0) { found = batch[index]; official = results[index]; }
  }
  console.log(JSON.stringify({ localHash:target.localHash, printed:target.printed, normalized:found, official }, null, 2));
}
