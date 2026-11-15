export type MathTokenKind = 'atom' | 'text' | 'operator' | 'boundary' | 'open' | 'close' | 'power' | 'subscript' | 'suffix' | 'all' | 'root' | 'rootScope' | 'rootEnd';
export interface MathToken { kind: MathTokenKind; value: string; spoken?: string }

// Token boundaries use Unicode letters, not JavaScript's ASCII-only \b.
export function splitMathSpeech(text: string): string[] {
  return text.normalize('NFC').replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿˣ₀₁₂₃₄₅₆₇₈₉₋₊ₙᵢₓ])/gu, ' $1 ')
    .match(/\d+[.,]\d+|[\p{L}\p{M}\d]+|[^\s]/gu) ?? [];
}

const entries: { phrases: string; kind: MathTokenKind; value: string }[] = [
  { phrases: 'mở ngoặc|mở ngoặc tròn', kind: 'open', value: '(' },
  { phrases: 'đóng ngoặc|đóng ngoặc tròn', kind: 'close', value: ')' },
  { phrases: 'mở ngoặc vuông', kind: 'open', value: '[' },
  { phrases: 'đóng ngoặc vuông', kind: 'close', value: ']' },
  { phrases: 'mở ngoặc nhọn', kind: 'open', value: '{' },
  { phrases: 'đóng ngoặc nhọn', kind: 'close', value: '}' },
  { phrases: 'tất cả|toàn bộ', kind: 'all', value: 'tất cả' },
  { phrases: 'bình phương|bình', kind: 'suffix', value: '²' },
  { phrases: 'lập phương', kind: 'suffix', value: '³' },
  { phrases: 'mũ|lũy thừa', kind: 'power', value: '^' },
  { phrases: 'chỉ số|chỉ số dưới', kind: 'subscript', value: '_' },
  { phrases: 'căn bậc hai của|căn bậc 2 của|căn của', kind: 'rootScope', value: '√' },
  { phrases: 'căn bậc ba của|căn bậc 3 của', kind: 'rootScope', value: '∛' },
  { phrases: 'căn bậc hai|căn bậc 2|căn', kind: 'root', value: '√' },
  { phrases: 'căn bậc ba|căn bậc 3', kind: 'root', value: '∛' },
  { phrases: 'hết căn|đóng căn', kind: 'rootEnd', value: 'hết căn' },
  { phrases: 'cộng trừ|cộng hoặc trừ', kind: 'operator', value: '±' },
  { phrases: 'cộng', kind: 'operator', value: '+' },
  { phrases: 'trừ|âm', kind: 'operator', value: '-' },
  { phrases: 'nhân với|nhân', kind: 'operator', value: '·' },
  { phrases: 'chia cho|chia|phần|trên', kind: 'operator', value: '/' },
  { phrases: 'lớn hơn hoặc bằng|lớn hơn hay bằng', kind: 'boundary', value: '≥' },
  { phrases: 'nhỏ hơn hoặc bằng|bé hơn hoặc bằng|nhỏ hơn hay bằng', kind: 'boundary', value: '≤' },
  { phrases: 'lớn hơn', kind: 'boundary', value: '>' },
  { phrases: 'nhỏ hơn|bé hơn', kind: 'boundary', value: '<' },
  { phrases: 'bằng', kind: 'boundary', value: '=' },
  { phrases: 'không bằng|khác', kind: 'boundary', value: '≠' },
  { phrases: 'xấp xỉ|gần bằng', kind: 'boundary', value: '≈' },
  { phrases: 'suy ra', kind: 'boundary', value: '⇒' },
  { phrases: 'tương đương|khi và chỉ khi', kind: 'boundary', value: '⇔' },
  { phrases: 'vuông góc với|vuông góc', kind: 'boundary', value: '⊥' },
  { phrases: 'song song với|song song', kind: 'boundary', value: '∥' },
  { phrases: 'không thuộc', kind: 'boundary', value: '∉' },
  { phrases: 'thuộc', kind: 'boundary', value: '∈' },
  { phrases: 'tập con', kind: 'boundary', value: '⊂' },
  { phrases: 'hợp với|hợp', kind: 'operator', value: '∪' },
  { phrases: 'giao với|giao', kind: 'operator', value: '∩' },
  { phrases: 'tập rỗng|rỗng', kind: 'atom', value: '∅' },
  { phrases: 'đen-ta|đen ta|đenta|denta|delta', kind: 'atom', value: 'Δ' },
  { phrases: 'an-pha|an pha|alpha', kind: 'atom', value: 'α' },
  { phrases: 'bê-ta|bê ta|beta', kind: 'atom', value: 'β' },
  { phrases: 'ga-ma|ga ma|gama|gamma', kind: 'atom', value: 'γ' },
  { phrases: 'thê-ta|thê ta|theta', kind: 'atom', value: 'θ' },
  { phrases: 'lam-đa|lam đa|lambda', kind: 'atom', value: 'λ' },
  { phrases: 'pi', kind: 'atom', value: 'π' },
  { phrases: 'ô-mê-ga|ô mê ga|ômêga|omega', kind: 'atom', value: 'ω' },
  { phrases: 'tổng xích ma|xích-ma|xích ma|sigma', kind: 'atom', value: '∑' },
  { phrases: 'tích phân', kind: 'atom', value: '∫' },
  { phrases: 'vô cùng|vô cực', kind: 'atom', value: '∞' },
  { phrases: 'tam giác', kind: 'atom', value: '△' },
  { phrases: 'góc', kind: 'atom', value: '∠' },
  { phrases: 'độ', kind: 'suffix', value: '°' },
  { phrases: 'phần trăm', kind: 'suffix', value: '%' },
  { phrases: 'véc-tơ|véc tơ|vectơ|vector', kind: 'atom', value: '→' },
  { phrases: 'chấm phẩy', kind: 'boundary', value: ';' },
  { phrases: 'hai chấm', kind: 'boundary', value: ':' },
  { phrases: 'phẩy', kind: 'boundary', value: ',' },
  { phrases: 'chấm', kind: 'boundary', value: '.' },
  { phrases: 'xuống dòng', kind: 'boundary', value: '\n' },
];

const LETTERS: Record<string, string> = {
  a: 'a', bê: 'b', xê: 'c', dê: 'd', đê: 'd', e: 'e', ép: 'f', giê: 'g',
  hát: 'h', i: 'i', 'giây': 'j', ca: 'k', 'e lờ': 'l', 'em mờ': 'm',
  'en nờ': 'n', o: 'o', pê: 'p', quy: 'q', 'e rờ': 'r', 'ét': 's',
  tê: 't', u: 'u', vê: 'v', 'vê kép': 'w', ích: 'x', 'ích xì': 'x',
  'ích xi': 'x', 'ích sì': 'x', 'xờ': 'x', 'i grec': 'y', 'y dài': 'y', 'i dài': 'y', 'dét': 'z',
};
for (const [name, letter] of Object.entries(LETTERS)) {
  if (name !== letter) entries.push({ phrases: name, kind: 'atom', value: letter });
  for (const alias of new Set([name, letter])) {
    entries.push({ phrases: `chữ ${alias}`, kind: 'atom', value: letter });
    entries.push({ phrases: `${alias} hoa|chữ ${alias} hoa`, kind: 'atom', value: letter.toUpperCase() });
    entries.push({ phrases: `${alias} thường|chữ ${alias} thường`, kind: 'atom', value: letter });
  }
}

export const SPEECH_PHRASES = entries.flatMap(entry => entry.phrases.split('|').map(phrase => ({
  words: splitMathSpeech(phrase), token: { kind: entry.kind, value: entry.value } as MathToken,
}))).sort((a, b) => b.words.length - a.words.length);
