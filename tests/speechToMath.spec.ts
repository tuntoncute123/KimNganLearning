import { test, expect } from '@playwright/test';
import { parseSpeechToMath } from '../src/utils/speechToMath';
import { MATH_SPEECH_EXAMPLES } from '../src/utils/mathSpeechExamples';

for (const example of MATH_SPEECH_EXAMPLES) {
  test(`teacher example: ${example.speech}`, () => {
    expect(parseSpeechToMath(example.speech)).toBe(example.math);
  });
}

const regressions: [string, string][] = [
  ['', ''], ['   ', ''], ['x cộng một', 'x + 1'], ['A cộng b', 'A + b'],
  ['BÌNH', 'BÌNH'], ['X BÌNH PHƯƠNG CỘNG HAI', 'X² + 2'],
  ['a bình / 2 + 3', 'a² / 2 + 3'], ['A + b tất cả bình / 2 + 3', '(A + b)² / 2 + 3'],
  ['a² / 2 + 3', 'a² / 2 + 3'], ['(A+b)²/(2+3)', '(A + b)² / (2 + 3)'],
  ['Ta có: a cộng b tất cả bình chia hai cộng ba', 'Ta có: (a + b)² / 2 + 3'],
  ['y bằng a cộng b tất cả bình', 'y = (a + b)²'],
  ['a cộng mở ngoặc b cộng c tất cả bình đóng ngoặc', 'a + ((b + c)²)'],
  ['mở ngoặc a cộng b đóng ngoặc tất cả bình', '(a + b)²'],
  ['a cộng b tất cả bình cộng c tất cả bình', '((a + b)² + c)²'],
  ['a cộng b tất cả', 'a + b tất cả'], ['x mũ', 'x ^'],
  ['mở ngoặc a cộng b', '(a + b'],
  ['x mũ hai mươi ba', 'x²³'], ['x mũ không', 'x⁰'], ['x mũ một', 'x¹'],
  ['x mũ trừ mười hai', 'x⁻¹²'], ['x mũ n', 'xⁿ'], ['x mũ y', 'x^(y)'],
  ['x^12 + y^-2', 'x¹² + y⁻²'], ['x chỉ số không', 'x₀'], ['x chỉ số i', 'xᵢ'],
  ['âm hai bình', '-2²'], ['mở ngoặc âm hai đóng ngoặc bình', '(-2)²'],
  ['a chia âm hai', 'a / -2'], ['âm ba phần tư', '-3 / 4'],
  ['hai phẩy không năm', '2,05'], ['2 phẩy 05', '2,05'], ['2,05 cộng 3.5', '2,05 + 3.5'],
  ['không phẩy không không một', '0,001'], ['mười lăm phẩy hai mươi lăm', '15,25'],
  ['một nghìn không trăm lẻ năm', '1005'], ['hai ngàn hai mươi tư', '2024'],
  ['một tỷ hai trăm triệu ba nghìn bốn', '1200003004'],
  ['chín tỷ tỷ', '9000000000000000000'], ['một hai ba', '123'],
  ['hai nhân với ba bằng sáu', '2 · 3 = 6'], ['hai x cộng một', '2x + 1'],
  ['năm mươi phần trăm', '50%'], ['x cộng hoặc trừ hai', 'x ± 2'],
  ['a không bằng b', 'a ≠ b'], ['a bé hơn hoặc bằng b', 'a ≤ b'],
  ['a thuộc A', 'a ∈ A'], ['A hợp với B', 'A ∪ B'], ['AB song song với CD', 'AB ∥ CD'],
  ['an pha cộng bê ta bằng pi', 'α + β = π'], ['tổng xích ma', '∑'],
  ['tích phân x', '∫ x'], ['véc tơ AB', '→ AB'],
  ['căn x bình cộng một', '√x² + 1'], ['căn mở ngoặc x cộng một đóng ngoặc cộng hai', '√(x + 1) + 2'],
  ['căn của x cộng một hết căn cộng hai', '√(x + 1) + 2'],
  ['căn của mở ngoặc x cộng một đóng ngoặc bình', '(√(x + 1))²'],
  ['căn âm hai', '√(-2)'],
  ['căn của căn của x hết căn cộng một hết căn chia hai', '√(√(x) + 1) / 2'],
  ['xⁿ cộng y tất cả bình', '(xⁿ + y)²'],
  ['a cộng b xuống dòng c cộng d tất cả bình', 'a + b\n(c + d)²'],
  ['a cộng b\nc cộng d tất cả bình', 'a + b\n(c + d)²'],
  ['Ta có hai nghiệm', 'Ta có 2 nghiệm'], ['bình luận', 'bình luận'],
  ['cộngđồng', 'cộngđồng'], ['độ dài', 'độ dài'],
];
for (const [speech, math] of regressions) {
  test(`regression: ${speech || '(empty)'}`, () => expect(parseSpeechToMath(speech)).toBe(math));
}
test('Vietnamese combining accents are normalized', () => {
  expect(parseSpeechToMath('a cộng bê tất cả bình phương'.normalize('NFD'))).toBe('(a + b)²');
});
