export type Digits = [number, number, number];

export type Game = {
  hash: string;
  n: number;
  code: number;
  par: number;
  ind: number[];
  law: number[];
  crypt: number[];
  color?: number;
  source?: 'bank' | 'official';
};

export const initialGame: Game = {
  hash: 'A41 AA5',
  n: 4,
  code: 314,
  par: 5,
  ind: [2, 10, 11, 16],
  law: [3, 50, 92, 132],
  crypt: [599, 635, 289, 515],
  color: 1,
  source: 'bank',
};

export const cardHints: Record<number, string> = {
  1: '蓝色数字与 1 比较', 2: '蓝色数字与 3 比较', 3: '黄色数字与 3 比较', 4: '黄色数字与 4 比较',
  5: '蓝色数字的奇偶性', 6: '黄色数字的奇偶性', 7: '紫色数字的奇偶性', 8: '密码中数字 1 的数量',
  9: '密码中数字 3 的数量', 10: '密码中数字 4 的数量', 11: '蓝色与黄色比较', 12: '蓝色与紫色比较',
  13: '黄色与紫色比较', 14: '哪个颜色最小', 15: '哪个颜色最大', 16: '偶数与奇数谁更多',
  17: '偶数的确切数量', 18: '三数之和的奇偶性', 19: '蓝色加黄色与 6 比较', 20: '重复数字的类型',
  21: '是否恰有一对相同数字', 22: '升序、降序或无序', 23: '三数之和与 6 比较', 24: '连续递增的相邻数字',
  25: '连续递增或递减的相邻数字', 26: '哪个颜色小于 3', 27: '哪个颜色小于 4', 28: '哪个颜色等于 1',
  29: '哪个颜色等于 3', 30: '哪个颜色等于 4', 31: '哪个颜色大于 1', 32: '哪个颜色大于 3',
  33: '某个颜色的奇偶性', 34: '哪个颜色最小或并列最小', 35: '哪个颜色最大或并列最大', 36: '总和是 3、4 或 5 的倍数',
  37: '哪两个颜色之和为 4', 38: '哪两个颜色之和为 6', 39: '某个颜色与 1 比较', 40: '某个颜色与 3 比较',
  41: '某个颜色与 4 比较', 42: '某个颜色最小或最大', 43: '蓝色与另一个颜色比较', 44: '黄色与另一个颜色比较',
  45: '数字 1 或 3 的数量', 46: '数字 3 或 4 的数量', 47: '数字 1 或 4 的数量', 48: '任意两个颜色比较',
};

// 每张标准卡正面公开的全部可能标准。此表专供“验证器速查”使用，
// 不从题库反推，避免某个标准暂未出现在内置题目中时被错误遗漏。
export const cardLawOptions: Record<number, number[]> = {
  1:[1,16], 2:[3,18,25], 3:[8,21,28], 4:[9,10,29], 5:[34,37], 6:[35,38], 7:[36,39], 8:[40,41,42],
  9:[46,47,48], 10:[49,50,51], 11:[89,92,94], 12:[90,93,96], 13:[91,95,97], 14:[116,117,118],
  15:[113,114,115], 16:[131,132], 17:[85,86,87,88], 18:[55,56], 19:[100,136,137], 20:[119,120,121],
  21:[81,82], 22:[133,134,135], 23:[60,67,74], 24:[83,84], 25:[122,123,124], 26:[25,28,31],
  27:[26,29,32], 28:[1,6,11], 29:[3,8,13], 30:[4,9,14], 31:[16,19,22], 32:[18,21,24],
  33:[34,35,36,37,38,39], 34:[128,129,130], 35:[125,126,127], 36:[57,58,59], 37:[98,103,108],
  38:[100,105,110], 39:[1,6,11,16,19,22], 40:[3,8,13,18,21,24,25,28,31],
  41:[4,5,9,10,14,15,26,29,32], 42:[113,114,115,116,117,118], 43:[89,90,92,93,94,96],
  44:[89,91,92,94,95,97], 45:[40,41,42,46,47,48], 46:[46,47,48,49,50,51],
  47:[40,41,42,49,50,51], 48:[89,90,91,92,93,94,95,96,97],
};

const count = (digits: Digits, value: number) => digits.filter((digit) => digit === value).length;
const evenCount = (digits: Digits) => digits.filter((digit) => digit % 2 === 0).length;
const maxFrequency = (digits: Digits) => Math.max(...digits.map((digit) => count(digits, digit)));
const ascendingSteps = ([blue, yellow, purple]: Digits) => Number(yellow === blue + 1) + Number(purple === yellow + 1);
const consecutiveSteps = ([blue, yellow, purple]: Digits) => Number(Math.abs(yellow - blue) === 1) + Number(Math.abs(purple - yellow) === 1);
const consecutiveTriple = ([blue, yellow, purple]: Digits) => (yellow === blue + 1 && purple === yellow + 1) || (yellow === blue - 1 && purple === yellow - 1);

export function evaluateLaw(law: number, digits: Digits): boolean {
  const [blue, yellow, purple] = digits;
  const sum = blue + yellow + purple;
  const evens = evenCount(digits);
  switch (law) {
    case 1: return blue === 1; case 3: return blue === 3; case 4: return blue === 4; case 5: return blue === 5;
    case 6: return yellow === 1; case 8: return yellow === 3; case 9: return yellow === 4; case 10: return yellow === 5;
    case 11: return purple === 1; case 13: return purple === 3; case 14: return purple === 4; case 15: return purple === 5;
    case 16: return blue > 1; case 18: return blue > 3; case 19: return yellow > 1; case 21: return yellow > 3;
    case 22: return purple > 1; case 24: return purple > 3; case 25: return blue < 3; case 26: return blue < 4;
    case 28: return yellow < 3; case 29: return yellow < 4; case 31: return purple < 3; case 32: return purple < 4;
    case 34: return blue % 2 === 0; case 35: return yellow % 2 === 0; case 36: return purple % 2 === 0;
    case 37: return blue % 2 === 1; case 38: return yellow % 2 === 1; case 39: return purple % 2 === 1;
    case 40: return count(digits, 1) === 0; case 41: return count(digits, 1) === 1; case 42: return count(digits, 1) === 2;
    case 46: return count(digits, 3) === 0; case 47: return count(digits, 3) === 1; case 48: return count(digits, 3) === 2;
    case 49: return count(digits, 4) === 0; case 50: return count(digits, 4) === 1; case 51: return count(digits, 4) === 2;
    case 55: return sum % 2 === 0; case 56: return sum % 2 === 1; case 57: return sum % 3 === 0;
    case 58: return sum % 4 === 0; case 59: return sum % 5 === 0; case 60: return sum === 6;
    case 67: return sum > 6; case 74: return sum < 6;
    case 81: return maxFrequency(digits) !== 2; case 82: return maxFrequency(digits) === 2;
    case 83: return ascendingSteps(digits) === 0; case 84: return ascendingSteps(digits) === 1;
    case 85: return evens === 0; case 86: return evens === 1; case 87: return evens === 2; case 88: return evens === 3;
    case 89: return blue === yellow; case 90: return blue === purple; case 91: return yellow === purple;
    case 92: return blue > yellow; case 93: return blue > purple; case 94: return yellow > blue;
    case 95: return yellow > purple; case 96: return purple > blue; case 97: return purple > yellow;
    case 98: return blue + yellow === 4; case 100: return blue + yellow === 6;
    case 103: return blue + purple === 4; case 105: return blue + purple === 6;
    case 108: return yellow + purple === 4; case 110: return yellow + purple === 6;
    case 113: return blue > yellow && blue > purple; case 114: return yellow > blue && yellow > purple;
    case 115: return purple > blue && purple > yellow; case 116: return blue < yellow && blue < purple;
    case 117: return yellow < blue && yellow < purple; case 118: return purple < blue && purple < yellow;
    case 119: return maxFrequency(digits) === 3; case 120: return maxFrequency(digits) === 2; case 121: return maxFrequency(digits) === 1;
    case 122: return consecutiveSteps(digits) === 0;
    case 123: return consecutiveSteps(digits) > 0 && !consecutiveTriple(digits);
    case 124: return consecutiveTriple(digits);
    case 125: return blue >= yellow && blue >= purple; case 126: return yellow >= blue && yellow >= purple;
    case 127: return purple >= blue && purple >= yellow; case 128: return blue <= yellow && blue <= purple;
    case 129: return yellow <= blue && yellow <= purple; case 130: return purple <= blue && purple <= yellow;
    case 131: return evens > 1; case 132: return evens < 2;
    case 133: return blue < yellow && yellow < purple; case 134: return blue > yellow && yellow > purple;
    case 135: return !((blue < yellow && yellow < purple) || (blue > yellow && yellow > purple));
    case 136: return blue + yellow > 6; case 137: return blue + yellow < 6; case 138: return yellow > 4;
    case 139: return blue < yellow; case 140: return blue < purple; case 141: return yellow < purple;
    case 142: return blue > 4; case 143: return purple > 4; case 144: return yellow < blue; case 145: return yellow === blue;
    default: return false;
  }
}

export function lawText(law: number): string {
  const direct: Record<number, string> = {
    1:'蓝色 = 1',3:'蓝色 = 3',4:'蓝色 = 4',5:'蓝色 > 4',6:'黄色 = 1',8:'黄色 = 3',9:'黄色 = 4',10:'黄色 > 4',11:'紫色 = 1',13:'紫色 = 3',14:'紫色 = 4',15:'紫色 > 4',
    16:'蓝色 > 1',18:'蓝色 > 3',19:'黄色 > 1',21:'黄色 > 3',22:'紫色 > 1',24:'紫色 > 3',25:'蓝色 < 3',26:'蓝色 < 4',28:'黄色 < 3',29:'黄色 < 4',31:'紫色 < 3',32:'紫色 < 4',
    34:'蓝色为偶数',35:'黄色为偶数',36:'紫色为偶数',37:'蓝色为奇数',38:'黄色为奇数',39:'紫色为奇数',40:'没有数字 1',41:'恰有一个 1',42:'恰有两个 1',46:'没有数字 3',47:'恰有一个 3',48:'恰有两个 3',49:'没有数字 4',50:'恰有一个 4',51:'恰有两个 4',
    55:'总和为偶数',56:'总和为奇数',57:'总和是 3 的倍数',58:'总和是 4 的倍数',59:'总和是 5 的倍数',60:'总和 = 6',67:'总和 > 6',74:'总和 < 6',81:'没有恰好一对',82:'恰好有一对',83:'没有连续递增相邻数',84:'恰有两个连续递增相邻数',85:'0 个偶数',86:'1 个偶数',87:'2 个偶数',88:'3 个偶数',
    89:'蓝色 = 黄色',90:'蓝色 = 紫色',91:'黄色 = 紫色',92:'蓝色 > 黄色',93:'蓝色 > 紫色',94:'黄色 > 蓝色',95:'黄色 > 紫色',96:'紫色 > 蓝色',97:'紫色 > 黄色',98:'蓝色 + 黄色 = 4',100:'蓝色 + 黄色 = 6',103:'蓝色 + 紫色 = 4',105:'蓝色 + 紫色 = 6',108:'黄色 + 紫色 = 4',110:'黄色 + 紫色 = 6',
    113:'蓝色严格最大',114:'黄色严格最大',115:'紫色严格最大',116:'蓝色严格最小',117:'黄色严格最小',118:'紫色严格最小',119:'三个数字相同',120:'恰有两个数字相同',121:'三个数字均不同',122:'没有连续递增或递减',123:'恰有两个连续递增或递减',124:'三个连续递增或递减',125:'蓝色最大或并列最大',126:'黄色最大或并列最大',127:'紫色最大或并列最大',128:'蓝色最小或并列最小',129:'黄色最小或并列最小',130:'紫色最小或并列最小',131:'偶数更多',132:'奇数更多',133:'严格升序',134:'严格降序',135:'无序',136:'蓝色 + 黄色 > 6',137:'蓝色 + 黄色 < 6',138:'黄色 > 4',139:'蓝色 < 黄色',140:'蓝色 < 紫色',141:'黄色 < 紫色',142:'蓝色 > 4',143:'紫色 > 4',144:'黄色 < 蓝色',145:'黄色 = 蓝色',
  };
  return direct[law] ?? `隐藏标准 ${law}`;
}

export function solutionDigits(game: Game): Digits {
  return String(game.code).padStart(3, '0').split('').map(Number) as Digits;
}
