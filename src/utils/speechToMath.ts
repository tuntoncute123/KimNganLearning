import { SPEECH_PHRASES, splitMathSpeech, type MathToken } from './speechMathLexicon';
import { readVietnameseNumber } from './vietnameseNumbers';

const SUPER: Record<string, string> = Object.fromEntries(Array.from('0123456789-+nx').map((c, i) => [c, Array.from('⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿˣ')[i]]));
const SUB: Record<string, string> = Object.fromEntries(Array.from('0123456789-+nix').map((c, i) => [c, Array.from('₀₁₂₃₄₅₆₇₈₉₋₊ₙᵢₓ')[i]]));
const CLOSE: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

function tokenize(text: string): MathToken[] {
  const words = splitMathSpeech(text);
  const lower = words.map(word => word.toLocaleLowerCase('vi'));
  const tokens: MathToken[] = [];
  for (let i = 0; i < words.length;) {
    const phrase = SPEECH_PHRASES.find(rule => rule.words.every((word, offset) => word === lower[i + offset]));
    // Long phrases (e.g. "không thuộc", "hai chấm") take precedence over numbers.
    if (phrase) {
      tokens.push({ ...phrase.token, spoken: words.slice(i, i + phrase.words.length).join(' ') });
      i += phrase.words.length; continue;
    }
    const number = readVietnameseNumber(lower, i);
    if (number) { tokens.push({ kind: 'atom', value: number.value }); i = number.end; continue; }
    const value = words[i++];
    let kind: MathToken['kind'] = 'text';
    if (/^[a-zA-Zα-ωΑ-Ω\d]+(?:[.,]\d+)?$/u.test(value) || /^[∞∅∑∫△∠→]$/u.test(value)) kind = 'atom';
    else if (/^[+−\-*/·×÷±∪∩]$/u.test(value)) kind = 'operator';
    else if (/^[=≠≈<>≥≤⇒⇔⊥∥∈∉⊂,;:.]$/u.test(value)) kind = 'boundary';
    else if (value in CLOSE) kind = 'open';
    else if (Object.values(CLOSE).includes(value)) kind = 'close';
    else if (value === '^') kind = 'power';
    else if (value === '_') kind = 'subscript';
    else if (/^[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿˣ₀₁₂₃₄₅₆₇₈₉₋₊ₙᵢₓ°%]$/u.test(value)) kind = 'suffix';
    else if (value === '√' || value === '∛') kind = 'root';
    tokens.push({ kind, value: value === '−' ? '-' : value });
  }
  return tokens;
}

function format(tokens: MathToken[]): string {
  return tokens.map((token, index) => {
    const previous = tokens[index - 1];
    const coefficient = previous?.kind === 'atom' && /^\d+(?:[.,]\d+)?$/u.test(previous.value)
      && token.kind === 'atom' && /^[a-zA-Zα-ωΑ-Ω]/u.test(token.value);
    return (index && !coefficient ? ' ' : '') + token.value;
  }).join('')
    .replace(/ *([,;:.]) */gu, '$1 ')
    .replace(/(\d)([.,]) +(\d)/gu, '$1$2$3')
    .replace(/([([{]) +/gu, '$1').replace(/ +([)\]}])/gu, '$1')
    .replace(/([√∛]) +/gu, '$1')
    .replace(/(^|[=([{<>≥≤≈≠⇒⇔+*/·×÷±-]) *- +(?=[\dA-Za-zα-ωΑ-Ω([{√∛])/gu,
      (_, prefix: string) => prefix + (prefix && !/[([{]/u.test(prefix) ? ' ' : '') + '-')
    .replace(/ *\n */gu, '\n').trim();
}

function enclosed(value: string): string {
  // Only omit extra parentheses when one matching pair encloses the ENTIRE value.
  if (CLOSE[value[0]] === value.at(-1)) {
    let depth = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] in CLOSE) depth++;
      else if (Object.values(CLOSE).includes(value[i])) depth--;
      if (depth === 0 && i < value.length - 1) return `(${value})`;
    }
    return value;
  }
  return `(${value})`;
}

function readGroup(tokens: MathToken[], start: number): { value: string; end: number } {
  const stack = [CLOSE[tokens[start].value]];
  let end = start + 1;
  for (; end < tokens.length; end++) {
    if (tokens[end].kind === 'open') stack.push(CLOSE[tokens[end].value]);
    else if (tokens[end].kind === 'close') {
      if (tokens[end].value !== stack.at(-1)) break;
      stack.pop();
      if (!stack.length) break;
    }
  }
  const closed = !stack.length;
  const value = tokens[start].value + render(tokens.slice(start + 1, end)) + (closed ? tokens[end].value : '');
  return { value, end: closed ? end + 1 : end };
}

function readOperand(tokens: MathToken[], start: number): { value: string; end: number } | null {
  const token = tokens[start];
  if (!token) return null;
  if (token.kind === 'open') return readGroup(tokens, start);
  if (token.kind === 'atom') return { value: token.value, end: start + 1 };
  if (token.kind === 'operator' && /^[+-]$/u.test(token.value)) {
    const next = readOperand(tokens, start + 1);
    if (next) return { value: token.value + next.value, end: next.end };
  }
  return null;
}

function script(value: string, subscript: boolean): string {
  const map = subscript ? SUB : SUPER;
  return Array.from(value).every(char => map[char])
    ? Array.from(value).map(char => map[char]).join('')
    : `${subscript ? '_' : '^'}${enclosed(value)}`;
}

function render(tokens: MathToken[]): string {
  const output: MathToken[] = [];
  for (let i = 0; i < tokens.length;) {
    const token = tokens[i++];
    if (token.kind === 'open') {
      const group = readGroup(tokens, i - 1);
      output.push({ kind: 'atom', value: group.value }); i = group.end; continue;
    }
    if (token.kind === 'root' || token.kind === 'rootScope') {
      let end = i;
      if (tokens[i]?.kind === 'open') end = readGroup(tokens, i).end;
      else if (token.kind === 'rootScope') {
        let depth = 0;
        let nestedRoots = 0;
        for (; end < tokens.length; end++) {
          const next = tokens[end];
          if (!depth && (next.kind === 'boundary' || next.kind === 'text' || next.kind === 'close')) break;
          if (!depth && next.kind === 'rootEnd') {
            if (!nestedRoots) break;
            nestedRoots--;
          }
          if (!depth && next.kind === 'rootScope') nestedRoots++;
          if (next.kind === 'open') depth++;
          if (next.kind === 'close') depth--;
        }
      } else {
        const operand = readOperand(tokens, i);
        if (operand) {
          end = operand.end;
          while (tokens[end]?.kind === 'suffix') end++;
          if (tokens[end]?.kind === 'power') end = readOperand(tokens, end + 1)?.end ?? end;
        }
      }
      if (end > i) {
        const inside = render(tokens.slice(i, end));
        output.push({ kind: 'atom', value: token.value + (token.kind === 'rootScope' || /^[+-]/u.test(inside) ? enclosed(inside) : inside) });
        i = end + (tokens[end]?.kind === 'rootEnd' ? 1 : 0);
      } else output.push({ kind: 'text', value: token.value });
      continue;
    }
    if (token.kind === 'all') {
      const next = tokens[i];
      if (next && (['suffix', 'power'].includes(next.kind) || (next.kind === 'operator' && next.value === '/'))) {
        let start = output.length;
        while (start > 0 && ['atom', 'operator'].includes(output[start - 1].kind)) start--;
        const expression = output.slice(start);
        if (expression.length && expression.at(-1)?.kind === 'atom') {
          output.splice(start, expression.length, { kind: 'atom', value: enclosed(format(expression)) });
          continue;
        }
      }
      output.push({ kind: 'text', value: token.value }); continue;
    }
    if (token.kind === 'suffix' && output.at(-1)?.kind === 'atom') {
      const previous = output[output.length - 1];
      previous.value = (/^[√∛]/u.test(previous.value) ? enclosed(previous.value) : previous.value) + token.value;
      continue;
    }
    if (token.kind === 'power' || token.kind === 'subscript') {
      const operand = readOperand(tokens, i);
      if (operand && output.at(-1)?.kind === 'atom') {
        const previous = output[output.length - 1];
        previous.value = (/^[√∛]/u.test(previous.value) ? enclosed(previous.value) : previous.value) + script(operand.value, token.kind === 'subscript');
        i = operand.end; continue;
      }
    }
    output.push(token.kind === 'suffix' && token.spoken ? { kind: 'text', value: token.spoken } : { ...token });
  }
  return format(output);
}

/** Deterministic notation conversion; no evaluation and no implicit variable capitalization. */
export function parseSpeechToMath(speechText: string): string {
  // Newlines delimit expressions, so “tất cả” never captures a previous line.
  return speechText.normalize('NFC').split(/\r?\n/u).map(line => render(tokenize(line))).join('\n');
}

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
}
