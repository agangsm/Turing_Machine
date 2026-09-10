export type Locale = 'zh' | 'en';

export type LocalizedVerifierGuide = {
  description: string;
  warning?: string;
};

export const LANGUAGE_STORAGE = 'tm-language';

export const englishCardHints: Record<number, string> = {
  1: 'The blue number compared with 1', 2: 'The blue number compared with 3', 3: 'The yellow number compared with 3', 4: 'The yellow number compared with 4',
  5: 'Whether the blue number is even or odd', 6: 'Whether the yellow number is even or odd', 7: 'Whether the purple number is even or odd', 8: 'The number of 1s in the code',
  9: 'The number of 3s in the code', 10: 'The number of 4s in the code', 11: 'The blue number compared with the yellow number', 12: 'The blue number compared with the purple number',
  13: 'The yellow number compared with the purple number', 14: 'Which colour has the smallest number', 15: 'Which colour has the largest number', 16: 'Whether there are more even or odd numbers',
  17: 'The exact number of even numbers', 18: 'Whether the sum is even or odd', 19: 'The sum of blue and yellow compared with 6', 20: 'Whether numbers repeat in the code',
  21: 'Whether exactly two numbers are identical', 22: 'Whether the code is ascending, descending, or unordered', 23: 'The sum of the three numbers compared with 6', 24: 'Whether there is an ascending sequence of consecutive numbers',
  25: 'Whether there is a sequence of consecutive numbers', 26: 'Which colour has a number smaller than 3', 27: 'Which colour has a number smaller than 4', 28: 'Which colour has a number equal to 1',
  29: 'Which colour has a number equal to 3', 30: 'Which colour has a number equal to 4', 31: 'Which colour has a number greater than 1', 32: 'Which colour has a number greater than 3',
  33: 'Whether one colour is even or odd', 34: 'Which colour has the smallest number, including ties', 35: 'Which colour has the largest number, including ties', 36: 'Whether the sum is a multiple of 3, 4, or 5',
  37: 'Which pair of colours adds up to 4', 38: 'Which pair of colours adds up to 6', 39: 'One colour compared with 1', 40: 'One colour compared with 3',
  41: 'One colour compared with 4', 42: 'Which colour is the smallest or largest', 43: 'Blue compared with another colour', 44: 'Yellow compared with another colour',
  45: 'The number of 1s or 3s', 46: 'The number of 3s or 4s', 47: 'The number of 1s or 4s', 48: 'Any two colours compared',
};

export const englishLawText: Record<number, string> = {
  1:'Blue = 1',3:'Blue = 3',4:'Blue = 4',5:'Blue > 4',6:'Yellow = 1',8:'Yellow = 3',9:'Yellow = 4',10:'Yellow > 4',11:'Purple = 1',13:'Purple = 3',14:'Purple = 4',15:'Purple > 4',
  16:'Blue > 1',18:'Blue > 3',19:'Yellow > 1',21:'Yellow > 3',22:'Purple > 1',24:'Purple > 3',25:'Blue < 3',26:'Blue < 4',28:'Yellow < 3',29:'Yellow < 4',31:'Purple < 3',32:'Purple < 4',
  34:'Blue is even',35:'Yellow is even',36:'Purple is even',37:'Blue is odd',38:'Yellow is odd',39:'Purple is odd',40:'No 1s',41:'Exactly one 1',42:'Exactly two 1s',46:'No 3s',47:'Exactly one 3',48:'Exactly two 3s',49:'No 4s',50:'Exactly one 4',51:'Exactly two 4s',
  55:'The sum is even',56:'The sum is odd',57:'The sum is a multiple of 3',58:'The sum is a multiple of 4',59:'The sum is a multiple of 5',60:'Sum = 6',67:'Sum > 6',74:'Sum < 6',81:'Not exactly one pair',82:'Exactly one pair',83:'No ascending consecutive pair',84:'One ascending consecutive pair',85:'0 even numbers',86:'1 even number',87:'2 even numbers',88:'3 even numbers',
  89:'Blue = Yellow',90:'Blue = Purple',91:'Yellow = Purple',92:'Blue > Yellow',93:'Blue > Purple',94:'Yellow > Blue',95:'Yellow > Purple',96:'Purple > Blue',97:'Purple > Yellow',98:'Blue + Yellow = 4',100:'Blue + Yellow = 6',103:'Blue + Purple = 4',105:'Blue + Purple = 6',108:'Yellow + Purple = 4',110:'Yellow + Purple = 6',
  113:'Blue is strictly the largest',114:'Yellow is strictly the largest',115:'Purple is strictly the largest',116:'Blue is strictly the smallest',117:'Yellow is strictly the smallest',118:'Purple is strictly the smallest',119:'Three identical numbers',120:'Exactly two identical numbers',121:'Three different numbers',122:'No consecutive sequence',123:'A sequence of two consecutive numbers',124:'A sequence of three consecutive numbers',125:'Blue is largest or tied',126:'Yellow is largest or tied',127:'Purple is largest or tied',128:'Blue is smallest or tied',129:'Yellow is smallest or tied',130:'Purple is smallest or tied',131:'More even numbers',132:'More odd numbers',133:'Strictly ascending',134:'Strictly descending',135:'Unordered',136:'Blue + Yellow > 6',137:'Blue + Yellow < 6',138:'Yellow > 4',139:'Blue < Yellow',140:'Blue < Purple',141:'Yellow < Purple',142:'Blue > 4',143:'Purple > 4',144:'Yellow < Blue',145:'Yellow = Blue',
};

const compareNumber = (colour: string, value: number): LocalizedVerifierGuide => ({
  description: `This Verifier determines whether the ${colour} number is smaller than, equal to, or greater than ${value}.`,
  warning: `Passing the test only identifies the comparison; it does not reveal the exact ${colour} number.`,
});

const parity = (colour: string): LocalizedVerifierGuide => ({
  description: `This Verifier determines whether the ${colour} number is even (2 or 4) or odd (1, 3, or 5).`,
  warning: 'It only checks the specified colour; other colours may have the same parity.',
});

const exactCount = (value: number): LocalizedVerifierGuide => ({
  description: `This Verifier determines the exact number of ${value}s in the code: none, one, or two.`,
  warning: `It counts the number ${value} without revealing which colour positions contain it.`,
});

export const englishVerifierGuide: Record<number, LocalizedVerifierGuide> = {
  1: { description: 'This Verifier determines whether the blue number is equal to 1 or greater than 1.', warning: 'A proposal with blue 3 may pass “greater than 1”, but that does not establish that the blue number is 3.' },
  2: compareNumber('blue', 3), 3: compareNumber('yellow', 3), 4: compareNumber('yellow', 4),
  5: parity('blue'), 6: parity('yellow'), 7: parity('purple'),
  8: exactCount(1), 9: exactCount(3), 10: exactCount(4),
  11: { description: 'This Verifier compares the blue and yellow numbers and determines whether blue is smaller than, equal to, or greater than yellow.', warning: 'If the numbers are equal, the test only establishes equality, not their value.' },
  12: { description: 'This Verifier compares the blue and purple numbers and determines whether blue is smaller than, equal to, or greater than purple.', warning: 'If the numbers are equal, the test only establishes equality, not their value.' },
  13: { description: 'This Verifier compares the yellow and purple numbers and determines whether yellow is smaller than, equal to, or greater than purple.', warning: 'If the numbers are equal, the test only establishes equality, not their value.' },
  14: { description: 'This Verifier determines which of the blue, yellow, or purple numbers is strictly the smallest.', warning: 'If the smallest value is tied, none of the strictly-smallest criteria applies.' },
  15: { description: 'This Verifier determines which of the blue, yellow, or purple numbers is strictly the largest.', warning: 'If the largest value is tied, none of the strictly-largest criteria applies.' },
  16: { description: 'This Verifier determines whether the code contains more even numbers or more odd numbers.' },
  17: { description: 'This Verifier determines the exact number of even numbers in the code: zero, one, two, or three.' },
  18: { description: 'This Verifier determines whether the sum of the three numbers is even or odd.' },
  19: { description: 'This Verifier adds the blue and yellow numbers and determines whether their sum is smaller than, equal to, or greater than 6.' },
  20: { description: 'This Verifier determines whether all three numbers are different, exactly two are identical, or all three are identical.', warning: 'It does not reveal which positions or values are repeated.' },
  21: { description: 'This Verifier determines whether the code contains exactly one pair of identical numbers.', warning: 'Three identical numbers do not count as exactly one pair, and the test does not reveal the repeated value or positions.' },
  22: { description: 'This Verifier determines whether the code is strictly ascending, strictly descending, or unordered.', warning: 'Equal numbers are neither strictly ascending nor strictly descending; for example, 223 is not ascending.' },
  23: { description: 'This Verifier determines whether the sum of the three numbers is smaller than, equal to, or greater than 6.' },
  24: { description: 'This Verifier checks for an ascending sequence of consecutive numbers, such as 1-2 in 312 or the full sequence in 345.', warning: 'The numbers must be both ascending and consecutive; 1 and 3 in 132 are ascending but not consecutive.' },
  25: { description: 'This Verifier checks for an ascending or descending sequence of consecutive numbers, such as 312, 254, 345, or 321.', warning: 'It identifies the type of consecutive sequence without revealing whether it ascends or descends.' },
  26: { description: 'This Verifier knows one colour and checks whether its number is smaller than 3.', warning: 'Other colours may also be smaller than 3; only the known colour is tested.' },
  27: { description: 'This Verifier knows one colour and checks whether its number is smaller than 4.', warning: 'Other colours may also be smaller than 4; only the known colour is tested.' },
  28: { description: 'This Verifier knows one colour and checks whether its number is equal to 1.', warning: 'Other colours may also equal 1; only the known colour is tested.' },
  29: { description: 'This Verifier knows one colour and checks whether its number is equal to 3.', warning: 'Other colours may also equal 3; only the known colour is tested.' },
  30: { description: 'This Verifier knows one colour and checks whether its number is equal to 4.', warning: 'Other colours may also equal 4; only the known colour is tested.' },
  31: { description: 'This Verifier knows one colour and checks whether its number is greater than 1.', warning: 'Other colours may also be greater than 1; only the known colour is tested.' },
  32: { description: 'This Verifier knows one colour and checks whether its number is greater than 3.', warning: 'Other colours may also be greater than 3; only the known colour is tested.' },
  33: { description: 'This Verifier knows one colour and determines whether its number is even or odd.', warning: 'Other colours may share that parity; only the known colour is tested.' },
  34: { description: 'This Verifier determines which colour has the smallest number, including a tie for the smallest.', warning: 'Unlike “strictly smallest”, a colour still satisfies this criterion when the smallest value is tied.' },
  35: { description: 'This Verifier determines which colour has the largest number, including a tie for the largest.', warning: 'Unlike “strictly largest”, a colour still satisfies this criterion when the largest value is tied.' },
  36: { description: 'This Verifier determines whether the sum of all three numbers is a multiple of 3, 4, or 5.' },
  37: { description: 'This Verifier knows two colours and checks whether their numbers add up to 4.' },
  38: { description: 'This Verifier knows two colours and checks whether their numbers add up to 6.' },
  39: compareNumber('specified colour', 1), 40: compareNumber('specified colour', 3), 41: compareNumber('specified colour', 4),
  42: { description: 'This Verifier knows one colour and determines whether its number is strictly smaller than both other numbers or strictly greater than both.', warning: 'A tie for the smallest or largest does not satisfy a strict comparison.' },
  43: { description: 'This Verifier compares blue with one other known colour and determines whether blue is smaller than, equal to, or greater than it.', warning: 'The Verifier knows whether the other colour is yellow or purple, but does not reveal it.' },
  44: { description: 'This Verifier compares yellow with one other known colour and determines whether yellow is smaller than, equal to, or greater than it.', warning: 'The Verifier knows whether the other colour is blue or purple, but does not reveal it.' },
  45: { description: 'This Verifier knows whether it checks the number 1 or 3 and determines its exact count: none, one, or two.', warning: 'It does not reveal which colour positions contain those numbers.' },
  46: { description: 'This Verifier knows whether it checks the number 3 or 4 and determines its exact count: none, one, or two.', warning: 'It does not reveal which colour positions contain those numbers.' },
  47: { description: 'This Verifier knows whether it checks the number 1 or 4 and determines its exact count: none, one, or two.', warning: 'It does not reveal which colour positions contain those numbers.' },
  48: { description: 'This Verifier knows two colours and determines whether one number is smaller than, equal to, or greater than the other.', warning: 'The Verifier knows the colour pair and comparison direction, but does not reveal them.' },
};

const englishUi: Record<string, string> = {
  '推理草稿': 'Deduction Notes', '本题推理草稿，只读': 'Deduction notes for this puzzle, read only', '只读记录': 'Read-only record', '自动保存': 'Autosaved',
  '本题没有保存推理草稿。': 'No deduction notes were saved for this puzzle.', '在这里记录排除过程、可能的标准与下一步思路……（仍建议你用纸笔推理）': 'Record eliminations, possible criteria, and your next steps here… (Paper-and-pencil deduction is still recommended.)', '本题保存的推理草稿': 'Saved deduction notes for this puzzle', '输入推理草稿': 'Enter deduction notes',
  '图灵大师挑战': 'Turing Master Challenge', '换一题': 'Change Puzzle', '退出挑战': 'Leave Challenge', '找出唯一的三位密码': 'Find the Unique Three-Digit Code',
  '组成你的方案': 'Build Your Proposal', '选择要询问的验证器': 'Choose Verifiers to Question', '本轮方案': 'Current Proposal', '最多选择 3 个验证器': 'Choose up to 3 Verifiers',
  '确认后无法撤回本次提交': 'This submission cannot be undone', '认为已经确定答案？': 'Think you have found the code?', '查看答案': 'Reveal Answer', '验证密码': 'Verify Code',
  '这个密码不正确。': 'That code is incorrect.', '继续推理，答对后才能进入下一题。': 'Keep deducing; you must solve this puzzle before moving on.', '你仍可继续询问和推理。': 'You can continue questioning and deducing.',
  '挑战成为图灵大师？': 'Become a Turing Master?', '否，暂不参加': 'Not Now', '是，开始挑战': 'Yes, Start Challenge',
  '北京时间每日固定 10 题：2 道入门、4 道标准、4 道困难。正式解题时间共 60 分钟；每题答对后有 2 分钟不计时复盘。只能答对当前题后进入下一题，挑战中不可查看答案。': 'A fixed daily set follows China Standard Time: 2 introductory, 4 standard, and 4 hard puzzles. You have 60 minutes of active solving time, with a 2-minute untimed review after each correct answer. You must solve each puzzle before continuing, and answers cannot be revealed during the challenge.',
  '同一天首次开始为正式挑战；之后可练习重玩，不覆盖正式成绩。': 'Your first attempt of the day is official. Later attempts are practice and do not replace the official result.',
  '或许还差一步推导出来，是否现在查看答案？': 'You may be only one deduction away. Reveal the answer now?', '否，继续推理': 'No, Keep Deducing', '是，查看答案': 'Yes, Reveal Answer',
  '退出图灵大师挑战': 'LEAVE TURING MASTER CHALLENGE', '确定要放弃当前挑战吗？': 'Are you sure you want to abandon this challenge?', '继续挑战': 'Continue Challenge', '确认放弃': 'Abandon Challenge',
  '放弃后将立即退出，并失去今天再次进行正式挑战的资格。今天再次进入时，只能以无计时练习模式重玩当日题组。': 'Leaving now ends your official attempt and uses today’s eligibility. Any later attempt today will be an untimed practice run of the same set.',
  '退出后本次练习进度不会保留。今天仍可重新开始无计时练习。': 'This practice progress will not be saved after leaving. You may restart today’s untimed practice later.',
  '解密成功': 'CODE BROKEN', '最终答案': 'FINAL CODE', '密码正确': 'Correct Code', '答案已揭晓': 'Answer Revealed', '回看记录': 'Review Notes', '再来一题': 'Another Puzzle',
  '收起，查看推理记录': 'Minimise and Review Deductions', '逻辑公布与整理时间': 'Criteria Reveal and Review', '进入下一道题 →': 'Start Next Puzzle →',
  '可收起此页查看本题的全部推理记录；倒计时结束后会自动进入下一题，休息时间不计入 60 分钟。': 'Minimise this window to review every deduction from this puzzle. The next puzzle begins automatically when the countdown ends; review time does not count toward the 60 minutes.',
  '遗憾，挑战时间结束': 'The Challenge Time Has Ended', '正式挑战未在 60 分钟内完成': 'The official challenge was not completed within 60 minutes', '继续训练': 'Continue Training',
  '恭喜你成为图灵大师': 'Congratulations, You Are a Turing Master', '恭喜完成图灵大师训练': 'Turing Master Training Complete', '♛ 10 道挑战全部完成': '♛ All 10 challenge puzzles completed', '练习模式 · 10 道挑战全部完成': 'Practice mode · All 10 puzzles completed',
  '挑战入口': 'CHALLENGE SELECTOR', '420 题附件合集，以及无限离线随机题': '420 Printable Challenges and Unlimited Offline Puzzles', '输入打印题卡或朋友分享的随机题短代码即可载入；随机题会在本机即时生成，并通过唯一解校验。': 'Load a printed challenge or a random puzzle shared by a friend using its short code. Random puzzles are generated locally and checked for a unique solution.',
  '题目短代码': 'Challenge Code', '载入题目': 'Load Puzzle', '验证器': 'Verifiers', '难度': 'Difficulty', '随机生成': 'Generate Random Puzzle', '附件题库': 'Printable Challenge Bank',
  '16 页 · 共 420 题 · 可离线载入': '16 pages · 420 puzzles · Available offline', '选择挑战': 'Choose a challenge',
  '此网页版汉化仅供学习交流 严禁用于任何商业途径': 'This unofficial web adaptation is for study and personal exchange only. Commercial use is strictly prohibited.', 'Turing Machine 官网 ↗': 'Official Turing Machine Website ↗',
  '推理记录': 'Deduction Record', '数字排除': 'Number Elimination', '点击数字切换划线': 'Click a number to cross it out', '开始第一次询问': 'Ask Your First Question', '每次回答都会自动记录在这里，方便你排除数字并锁定验证标准。': 'Every answer is recorded here so you can eliminate numbers and identify each criterion.',
  '记住': 'Remember', '验证器回答的是标准，而不是最终密码本身。所有验证器都不可缺少。': 'A Verifier answers about its criterion, not the final code itself. Every Verifier is essential.',
  '回看已完成的推理': 'Review a Completed Deduction', '只读复盘不会重新计时，也不会改变成绩、挑战进度或每日资格。': 'Read-only review does not restart the timer or alter your result, progress, or daily eligibility.', '本题最终密码': 'Final Code for This Puzzle', '已完成': 'Completed', '正确密码': 'Correct Code', '本题全部验证器': 'All Verifiers in This Puzzle', '复盘模式不可提问': 'Questions are disabled in review mode', '本题已经完成': 'This puzzle is complete', '只读模式': 'READ ONLY',
  '没有可回看的逐轮记录': 'No Round-by-Round Record', '这是旧版本保存的挑战记录；题目、标准卡和隐藏答案仍可正常复盘。': 'This challenge was saved by an older version. You can still review the puzzle, Criteria Cards, and hidden criteria.',
  '规则': 'Rules', '规则介绍': 'Rulebook', '查看完整网页版规则书': 'Open the official English PDF rulebook', '标准卡速查': 'Criteria Card Reference', '查看全部 48 张标准卡': 'Browse all 48 Criteria Cards',
  '全部 48 张标准卡的问题、可能标准与规则书说明。速查内容是公开信息，不会显示当前题目的隐藏答案。': 'Questions, possible criteria, and rulebook guidance for all 48 Criteria Cards. This public reference never reveals the hidden criterion for your current puzzle.',
  '暂无标准资料': 'No criteria available', '具体作用': 'How It Works', '注意': 'Important', '关闭速查': 'Close Reference',
  '推理统计': 'Deduction Statistics', '逐题数据': 'Puzzle Details', '用时最长：': 'Longest time:', '排列最多：': 'Most proposals:', '玩家最常使用的排列：': 'Most-used proposal:', '最常询问标准卡：': 'Most-questioned Criteria Card:', '答对最多的标准卡：': 'Most-passed Criteria Card:', '答错最多的标准卡：': 'Most-failed Criteria Card:',
  '尚无完成题目': 'No completed puzzles', '尚无记录': 'No record yet', '尚未询问': 'No questions yet', '未完成': 'Incomplete', '收起': 'Collapse', '展开': 'Expand', '复盘本题 →': 'Review This Puzzle →', '旧记录未保存逐轮详情，但仍可查看题目与隐藏标准。': 'This older record has no round-by-round history, but the puzzle and hidden criteria remain available.',
  '语言': 'Language', '中文': '中文', 'EN': 'EN',
};

export function ui(locale: Locale, chinese: string) {
  return locale === 'en' ? englishUi[chinese] ?? chinese : chinese;
}

export function difficultyText(locale: Locale, level: number) {
  const labels = locale === 'en' ? ['Introductory', 'Standard', 'Hard'] : ['入门', '标准', '困难'];
  return labels[level] ?? (locale === 'en' ? 'Unknown' : '未知');
}

export function colourText(locale: Locale, index: number) {
  return (locale === 'en' ? ['blue', 'yellow', 'purple'] : ['蓝色', '黄色', '紫色'])[index] ?? '';
}
