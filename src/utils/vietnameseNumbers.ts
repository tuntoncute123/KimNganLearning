/** Read a contiguous Vietnamese number without rounding large integers. */
const DIGITS: Record<string, string> = {
  không: '0', một: '1', mốt: '1', hai: '2', ba: '3', bốn: '4', tư: '4',
  năm: '5', lăm: '5', sáu: '6', bảy: '7', bẩy: '7', tám: '8', chín: '9',
};
const SCALES: Record<string, bigint> = {
  nghìn: 1000n, ngàn: 1000n, triệu: 1000000n, tỷ: 1000000000n, tỉ: 1000000000n,
};
const NUMBER_WORDS = new Set([...Object.keys(DIGITS), ...Object.keys(SCALES), 'mười', 'mươi', 'trăm', 'linh', 'lẻ']);

function integer(words: string[]): string | null {
  if (!words.length) return null;
  if (words.every(word => DIGITS[word] !== undefined || /^\d+$/u.test(word))) {
    return words.map(word => DIGITS[word] ?? word).join('');
  }
  let split = -1;
  let scale = 0n;
  words.forEach((word, index) => {
    if ((SCALES[word] ?? 0n) >= scale && SCALES[word]) { split = index; scale = SCALES[word]; }
  });
  if (split >= 0) {
    const left = integer(words.slice(0, split));
    const right = split === words.length - 1 ? '0' : integer(words.slice(split + 1));
    return left !== null && right !== null ? String(BigInt(left) * scale + BigInt(right)) : null;
  }
  let total = 0n;
  let pending: bigint | null = null;
  for (const word of words) {
    if (DIGITS[word] !== undefined || /^\d+$/u.test(word)) {
      if (pending !== null) return null;
      pending = BigInt(DIGITS[word] ?? word);
    } else if (word === 'trăm' || word === 'mươi') {
      if (pending === null) return null;
      total += pending * (word === 'trăm' ? 100n : 10n);
      pending = null;
    } else if (word === 'mười') {
      if (pending !== null) return null;
      total += 10n;
    } else if (word !== 'linh' && word !== 'lẻ') return null;
  }
  return String(total + (pending ?? 0n));
}

export function readVietnameseNumber(words: string[], start: number): { value: string; end: number } | null {
  const first = words[start];
  if (!(DIGITS[first] !== undefined || first === 'mười' || /^\d+$/u.test(first ?? ''))) return null;
  let end = start;
  while (end < words.length && (NUMBER_WORDS.has(words[end]) || /^\d+$/u.test(words[end]))) end++;
  // Keep an incomplete/unsupported phrase visible instead of silently dropping it.
  let value = integer(words.slice(start, end));
  while (value === null && end > start + 1) value = integer(words.slice(start, --end));
  if (value === null) return null;
  if (words[end] === 'phẩy' || words[end] === 'chấm') {
    let decimalEnd = end + 1;
    while (decimalEnd < words.length && (NUMBER_WORDS.has(words[decimalEnd]) || /^\d+$/u.test(words[decimalEnd]))) decimalEnd++;
    const fraction = integer(words.slice(end + 1, decimalEnd));
    if (fraction !== null) {
      value += (words[end] === 'phẩy' ? ',' : '.') + fraction;
      end = decimalEnd;
    }
  }
  return { value, end };
}
