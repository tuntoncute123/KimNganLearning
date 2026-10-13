/**
 * Tiện ích chuyển đổi lời nói tự nhiên tiếng Việt sang ký hiệu và công thức toán học
 * 100% Client-side, không cần backend hay API bên ngoài.
 */

// Bảng ánh xạ các cụm từ tiếng Việt sang ký hiệu toán học
const MATH_SPEECH_RULES: Array<{ pattern: RegExp; replacement: string }> = [
  // 1. Dấu ngoặc & Ngắt câu
  { pattern: /\bmở ngoặc\b/gi, replacement: '(' },
  { pattern: /\bđóng ngoặc\b/gi, replacement: ')' },
  { pattern: /\bchấm phẩy\b/gi, replacement: ';' },
  { pattern: /\bchấm\b/gi, replacement: '.' },
  { pattern: /\bphẩy\b/gi, replacement: ',' },

  // 2. Căn bậc hai & căn bậc ba
  { pattern: /\bcăn bậc ba của\b/gi, replacement: '∛' },
  { pattern: /\bcăn bậc 3 của\b/gi, replacement: '∛' },
  { pattern: /\bcăn bậc ba\b/gi, replacement: '∛' },
  { pattern: /\bcăn bậc 3\b/gi, replacement: '∛' },
  { pattern: /\bcăn bậc hai của\b/gi, replacement: '√' },
  { pattern: /\bcăn bậc 2 của\b/gi, replacement: '√' },
  { pattern: /\bcăn bậc hai\b/gi, replacement: '√' },
  { pattern: /\bcăn bậc 2\b/gi, replacement: '√' },
  { pattern: /\bcăn của\b/gi, replacement: '√' },
  { pattern: /\bcăn\b/gi, replacement: '√' },

  // 3. Số mũ & Lũy thừa
  { pattern: /\bbình phương\b/gi, replacement: '²' },
  { pattern: /\bmũ hai\b/gi, replacement: '²' },
  { pattern: /\bmũ 2\b/gi, replacement: '²' },
  { pattern: /\blập phương\b/gi, replacement: '³' },
  { pattern: /\bmũ ba\b/gi, replacement: '³' },
  { pattern: /\bmũ 3\b/gi, replacement: '³' },
  { pattern: /\bmũ bốn\b/gi, replacement: '⁴' },
  { pattern: /\bmũ 4\b/gi, replacement: '⁴' },
  { pattern: /\bmũ năm\b/gi, replacement: '⁵' },
  { pattern: /\bmũ 5\b/gi, replacement: '⁵' },
  { pattern: /\bmũ sáu\b/gi, replacement: '⁶' },
  { pattern: /\bmũ 6\b/gi, replacement: '⁶' },
  { pattern: /\bmũ bảy\b/gi, replacement: '⁷' },
  { pattern: /\bmũ 7\b/gi, replacement: '⁷' },
  { pattern: /\bmũ tám\b/gi, replacement: '⁸' },
  { pattern: /\bmũ 8\b/gi, replacement: '⁸' },
  { pattern: /\bmũ chín\b/gi, replacement: '⁹' },
  { pattern: /\bmũ 9\b/gi, replacement: '⁹' },
  { pattern: /\bmũ không\b/gi, replacement: '⁰' },
  { pattern: /\bmũ 0\b/gi, replacement: '⁰' },
  { pattern: /\bmũ n\b/gi, replacement: 'ⁿ' },
  { pattern: /\bmũ x\b/gi, replacement: 'ˣ' },
  { pattern: /\bmũ trừ một\b/gi, replacement: '⁻¹' },
  { pattern: /\bmũ trừ 1\b/gi, replacement: '⁻¹' },

  // 4. Chỉ số dưới (Subscript)
  { pattern: /\bchỉ số 1\b/gi, replacement: '₁' },
  { pattern: /\bchỉ số một\b/gi, replacement: '₁' },
  { pattern: /\bchỉ số 2\b/gi, replacement: '₂' },
  { pattern: /\bchỉ số hai\b/gi, replacement: '₂' },
  { pattern: /\bchỉ số 3\b/gi, replacement: '₃' },
  { pattern: /\bchỉ số ba\b/gi, replacement: '₃' },
  { pattern: /\bchỉ số n\b/gi, replacement: 'ₙ' },
  { pattern: /\bchỉ số i\b/gi, replacement: 'ᵢ' },
  { pattern: /\bx 1\b/gi, replacement: 'x₁' },
  { pattern: /\bx một\b/gi, replacement: 'x₁' },
  { pattern: /\bx 2\b/gi, replacement: 'x₂' },
  { pattern: /\bx hai\b/gi, replacement: 'x₂' },
  { pattern: /\by 1\b/gi, replacement: 'y₁' },
  { pattern: /\by 2\b/gi, replacement: 'y₂' },

  // 5. Chữ cái Hy Lạp & Toán học
  { pattern: /\bđen-ta\b/gi, replacement: 'Δ' },
  { pattern: /\bđen ta\b/gi, replacement: 'Δ' },
  { pattern: /\bdenta\b/gi, replacement: 'Δ' },
  { pattern: /\bdelta\b/gi, replacement: 'Δ' },
  { pattern: /\ban-pha\b/gi, replacement: 'α' },
  { pattern: /\ban pha\b/gi, replacement: 'α' },
  { pattern: /\balpha\b/gi, replacement: 'α' },
  { pattern: /\bbê-ta\b/gi, replacement: 'β' },
  { pattern: /\bbê ta\b/gi, replacement: 'β' },
  { pattern: /\bbeta\b/gi, replacement: 'β' },
  { pattern: /\bga-ma\b/gi, replacement: 'γ' },
  { pattern: /\bgama\b/gi, replacement: 'γ' },
  { pattern: /\bgamma\b/gi, replacement: 'γ' },
  { pattern: /\bthê-ta\b/gi, replacement: 'θ' },
  { pattern: /\bthê ta\b/gi, replacement: 'θ' },
  { pattern: /\btheta\b/gi, replacement: 'θ' },
  { pattern: /\blam-đa\b/gi, replacement: 'λ' },
  { pattern: /\blam đa\b/gi, replacement: 'λ' },
  { pattern: /\blambda\b/gi, replacement: 'λ' },
  { pattern: /\bpi\b/gi, replacement: 'π' },
  { pattern: /\bô-mê-ga\b/gi, replacement: 'ω' },
  { pattern: /\bômêga\b/gi, replacement: 'ω' },
  { pattern: /\bomega\b/gi, replacement: 'ω' },
  { pattern: /\bxích-ma\b/gi, replacement: '∑' },
  { pattern: /\bxích ma\b/gi, replacement: '∑' },
  { pattern: /\bsigma\b/gi, replacement: '∑' },
  { pattern: /\btổng xích ma\b/gi, replacement: '∑' },
  { pattern: /\btích phân\b/gi, replacement: '∫' },
  { pattern: /\bvô cùng\b/gi, replacement: '∞' },
  { pattern: /\bvô cực\b/gi, replacement: '∞' },

  // 6. Hình học & Quan hệ Logic
  { pattern: /\bvuông góc với\b/gi, replacement: '⊥' },
  { pattern: /\bvuông góc\b/gi, replacement: '⊥' },
  { pattern: /\bsong song với\b/gi, replacement: '∥' },
  { pattern: /\bsong song\b/gi, replacement: '∥' },
  { pattern: /\btam giác\b/gi, replacement: '△' },
  { pattern: /\bgóc\b/gi, replacement: '∠' },
  { pattern: /\bđộ\b/gi, replacement: '°' },
  { pattern: /\bvéc-tơ\b/gi, replacement: '→' },
  { pattern: /\bvéc tơ\b/gi, replacement: '→' },
  { pattern: /\bvectơ\b/gi, replacement: '→' },
  { pattern: /\bvector\b/gi, replacement: '→' },
  { pattern: /\bsuy ra\b/gi, replacement: '⇒' },
  { pattern: /\btương đương\b/gi, replacement: '⇔' },
  { pattern: /\bkhi và chỉ khi\b/gi, replacement: '⇔' },

  // 7. Tập hợp
  { pattern: /\bkhông thuộc\b/gi, replacement: '∉' },
  { pattern: /\bthuộc\b/gi, replacement: '∈' },
  { pattern: /\btập con\b/gi, replacement: '⊂' },
  { pattern: /\bhợp với\b/gi, replacement: '∪' },
  { pattern: /\bhợp\b/gi, replacement: '∪' },
  { pattern: /\bgiao với\b/gi, replacement: '∩' },
  { pattern: /\bgiao\b/gi, replacement: '∩' },
  { pattern: /\btập rỗng\b/gi, replacement: '∅' },
  { pattern: /\brỗng\b/gi, replacement: '∅' },

  // 8. So sánh & Phép toán
  { pattern: /\bcộng trừ\b/gi, replacement: '±' },
  { pattern: /\bcộng hoặc trừ\b/gi, replacement: '±' },
  { pattern: /\blớn hơn hoặc bằng\b/gi, replacement: '≥' },
  { pattern: /\bnhỏ hơn hoặc bằng\b/gi, replacement: '≤' },
  { pattern: /\bbé hơn hoặc bằng\b/gi, replacement: '≤' },
  { pattern: /\blớn hơn\b/gi, replacement: '>' },
  { pattern: /\bnhỏ hơn\b/gi, replacement: '<' },
  { pattern: /\bbé hơn\b/gi, replacement: '<' },
  { pattern: /\bxấp xỉ\b/gi, replacement: '≈' },
  { pattern: /\bgần bằng\b/gi, replacement: '≈' },
  { pattern: /\bkhác\b/gi, replacement: '≠' },
  { pattern: /\bbằng\b/gi, replacement: '=' },
  { pattern: /\bcộng\b/gi, replacement: '+' },
  { pattern: /\btrừ\b/gi, replacement: '-' },
  { pattern: /\bnhân với\b/gi, replacement: '·' },
  { pattern: /\bnhân\b/gi, replacement: '·' },
  { pattern: /\bchia cho\b/gi, replacement: '/' },
  { pattern: /\bchia\b/gi, replacement: '/' },
];

/**
 * Chuyển đổi văn bản giọng nói tiếng Việt thành công thức toán học
 * @param speechText Chuỗi văn bản nhận diện từ Web Speech API
 * @returns Chuỗi ký hiệu công thức toán học hoàn chỉnh
 */
export function parseSpeechToMath(speechText: string): string {
  if (!speechText) return '';

  let result = speechText;

  // Áp dụng từng quy tắc thay thế
  for (const rule of MATH_SPEECH_RULES) {
    result = result.replace(rule.pattern, rule.replacement);
  }

  // Tinh chỉnh khoảng cách giữa các toán tử để công thức hiển thị cân đối đẹp mắt
  result = result
    .replace(/\s*([+=\-≠≈<>≥≤⇒⇔⊥∥∪∩∈∉⊂])\s*/g, ' $1 ') // Cách 1 dấu cách quanh các phép toán và quan hệ
    .replace(/\s*([,;])\s*/g, '$1 ')                     // Dấu phẩy sát chữ trước, cách chữ sau
    .replace(/\(\s+/g, '(')                              // Bỏ khoảng trắng sau mở ngoặc
    .replace(/\s+\)/g, ')')                              // Bỏ khoảng trắng trước đóng ngoặc
    .replace(/√\s+/g, '√')                               // Căn sát liền kề biến
    .replace(/∛\s+/g, '∛')
    .replace(/\s*([²³⁴⁵⁶⁷⁸⁹⁰ⁿˣ⁻¹₁₂₃ₙᵢ°])\s*/g, '$1')   // Số mũ và chỉ số sát liền kề biến trước đó
    .replace(/\s{2,}/g, ' ')                             // Xóa khoảng trắng thừa
    .trim();

  // Viết hoa chữ cái đầu câu nếu cần
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result;
}

/**
 * Kiểm tra xem trình duyệt hiện tại có hỗ trợ Web Speech API hay không
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}
