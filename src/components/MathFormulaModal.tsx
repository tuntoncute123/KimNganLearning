import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  CornerDownLeft,
  Type,
} from 'lucide-react';
import {
  EyeOutlined,
  AudioOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { parseSpeechToMath } from '../utils/speechToMath';
import { MATH_SPEECH_EXAMPLES } from '../utils/mathSpeechExamples';
import { useMathDictation } from '../hooks/useMathDictation';
import './MathFormulaModal.css';

interface MathFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertFormula: (text: string) => void;
  initialText?: string;
  isEditing?: boolean;
}

const MATH_CATEGORIES = [
  {
    name: 'Số Mũ & Chỉ Số',
    symbols: ['²', '³', 'ⁿ', '₁', '₂', '₃', '⁻¹', '⁺', '⁻'],
  },
  {
    name: 'Phép Toán & Căn',
    symbols: ['√', '∛', '±', '÷', '×', '≠', '≈', '≤', '≥', '∞', '/'],
  },
  {
    name: 'Hình Học & Vectơ',
    symbols: ['Δ', '⊥', '∥', '∠', '→', '°', '△', '□', '•'],
  },
  {
    name: 'Đại Số & Hy Lạp',
    symbols: ['π', 'α', 'β', 'θ', 'λ', 'ω', '∈', '∉', '⊂', '∪', '∩', '∅', '∑', '∫'],
  },
  {
    name: 'Mẫu Lời Giải Nhanh',
    symbols: ['f(x) = ', 'y = ', 'Ta có: ', 'Suy ra: ⇒ ', 'Tương đương: ⇔ ', 'ĐK: '],
  },
];

export const MathFormulaModal: React.FC<MathFormulaModalProps> = ({
  isOpen,
  onClose,
  onInsertFormula,
  initialText = '',
  isEditing = false,
}) => {
  const [text, setText] = useState(initialText);
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const {
    isListening, transcript, error: voiceError, start, stop: stopListening,
    reset, setError: setVoiceError, setTranscript,
  } = useMathDictation(setText);

  const toggleListening = () => {
    if (isListening) stopListening();
    else start(text);
  };

  useEffect(() => {
    reset();
    if (!isOpen) return;
    setText(initialText);
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => { clearTimeout(timer); stopListening(); };
  }, [isOpen, initialText, reset, stopListening]);

  const convertTypedSpeech = () => {
    stopListening();
    setTranscript(text);
    setText(parseSpeechToMath(text));
  };

  if (!isOpen) return null;

  const handleInsertSymbol = (sym: string) => {
    stopListening();
    const textarea = inputRef.current;
    if (!textarea) {
      setText((prev) => prev + sym);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = text.substring(0, start) + sym + text.substring(end);
    setText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + sym.length;
      textarea.selectionEnd = start + sym.length;
    }, 0);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;
    stopListening();
    onInsertFormula(text.trim());
    setText('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container math-formula-modal-card" role="dialog" aria-modal="true"
        aria-labelledby="math-formula-title" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="math-modal-icon-badge">
              <Type size={18} className="text-primary" />
            </div>
            <div>
              <h3 id="math-formula-title" className="modal-title">
                {isEditing ? 'Chỉnh Sửa Công Thức Toán Học' : 'Chèn Công Thức & Lời Giải Toán Học'}
              </h3>
              <p className="text-xs text-muted">
                {isEditing
                  ? 'Chỉnh sửa bằng bàn phím hoặc bấm micro để nói bổ sung'
                  : 'Bấm phím ký hiệu bên dưới hoặc bấm micro để nói ra công thức tự động'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body math-modal-body">
          {/* Header ô nhập & Nút Mic Nói tạo công thức Realtime */}
          <div className="math-input-header flex items-center justify-between mb-1.5">
            <label htmlFor="math-formula-input" className="text-xs font-semibold text-muted">
              Nội dung công thức / lời giải:
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`voice-mic-btn ${isListening ? 'is-listening' : ''}`}
                aria-label={isListening ? 'Đang nghe... (Dừng)' : 'Nói ra công thức'}
                aria-pressed={isListening}
                onClick={toggleListening}
                title={
                  isListening
                    ? 'Đang lắng nghe... Bấm để dừng nhận diện giọng nói'
                    : 'Bấm để nói bằng tiếng Việt - Hệ thống tự động chuyển thành công thức Toán realtime (Không cần gõ phím)'
                }
              >
                <AudioOutlined className={`mic-icon ${isListening ? 'animate-pulse' : ''}`} />
                <span className="voice-btn-text">
                  {isListening ? 'Đang nghe... (Dừng)' : 'Nói ra công thức'}
                </span>
                {isListening && <span className="recording-dot" />}
              </button>

              <button
                type="button"
                className={`voice-help-toggle-btn ${showVoiceHelp ? 'is-active' : ''}`}
                aria-label="Mẫu câu nói"
                aria-expanded={showVoiceHelp}
                onClick={() => setShowVoiceHelp(!showVoiceHelp)}
                title="Xem các câu nói mẫu tiếng Việt để ra công thức chuẩn"
              >
                <BulbOutlined />
                <span>Mẫu câu nói</span>
              </button>

              {text.trim() && (
                <button
                  type="button"
                  className="clear-text-mini-btn"
                  onClick={() => { reset(); setText(''); }}
                  title="Xóa trắng ô nhập liệu"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          {/* Banner khi đang lắng nghe giọng nói realtime */}
          {isListening && (
            <div className="voice-listening-banner">
              <div className="voice-wave-animation">
                <span className="wave-bar bar-1" />
                <span className="wave-bar bar-2" />
                <span className="wave-bar bar-3" />
                <span className="wave-bar bar-4" />
                <span className="wave-bar bar-5" />
              </div>
              <div className="voice-status-text-group">
                <div className="voice-listening-lead">
                  <strong>Đang nhận diện giọng nói realtime...</strong> Nói đến đâu công thức xuất hiện đến đó!
                </div>
                <div className="voice-listening-hint">
                  Thử nói: “a cộng bê tất cả bình chia hai cộng ba”.
                </div>
              </div>
            </div>
          )}

          {transcript && (
            <div className="voice-transcript" role="status">
              <strong>Lời đọc gốc:</strong> <span>{transcript}</span>
            </div>
          )}

          {/* Thông báo lỗi Micro nếu có */}
          {voiceError && (
            <div className="voice-error-alert" role="alert">
              <span>⚠️ {voiceError}</span>
              <button
                type="button"
                className="voice-error-close"
                onClick={() => setVoiceError(null)}
              >
                ×
              </button>
            </div>
          )}

          {/* Bảng hướng dẫn mẫu câu nói tiếng Việt */}
          {showVoiceHelp && (
            <div className="voice-help-card">
              <div className="voice-help-title flex items-center justify-between">
                <span>💡 Cách đọc công thức và kết quả:</span>
                <button
                  type="button"
                  className="voice-help-close-btn"
                  onClick={() => setShowVoiceHelp(false)}
                >
                  Đóng
                </button>
              </div>
              <p className="voice-help-footer">
                “a cộng b bình” → a + b²; “a cộng b tất cả bình” → (a + b)².
                “Tất cả” gom biểu thức phía trước trong ngoặc hiện tại, sau dấu bằng hoặc dấu ngắt câu gần nhất.
                Phép chia chỉ lấy số/hạng ngay sau nó; đọc “mở ngoặc … đóng ngoặc” nếu mẫu số có tổng.
              </p>
              <p className="voice-help-footer">
                “Căn x cộng một” → √x + 1; “căn của x cộng một” → √(x + 1).
                Nói “hết căn” hoặc dùng ngoặc để kết thúc phần trong căn.
                Nói “hoa”, “thường” để chọn chữ; nói “chỉ số” khi cần chỉ số dưới.
                Kiểm tra bản xem trước trước khi chèn, nhất là câu có nhiều tầng ngoặc.
              </p>
              {Array.from(new Set(MATH_SPEECH_EXAMPLES.map(ex => ex.category))).map(category => (
                <details key={category} className="voice-example-category">
                  <summary>{category}</summary>
                  <div className="voice-help-grid">
                    {MATH_SPEECH_EXAMPLES.filter(ex => ex.category === category).map(ex => (
                      <button key={ex.speech} type="button" className="voice-example-item"
                        title="Điền câu mẫu để thử chuyển đổi"
                        onClick={() => { stopListening(); setTranscript(''); setText(ex.speech); inputRef.current?.focus(); }}>
                        <span className="example-speech">“{ex.speech}”</span>
                        <span className="example-arrow">➔</span>
                        <span className="example-math font-mono">{ex.math}</span>
                      </button>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}

          {/* Ô nhập công thức */}
          <div className="math-input-wrapper">
            <textarea
              id="math-formula-input"
              ref={inputRef}
              className="math-textarea"
              rows={3}
              placeholder="Ví dụ: Ta có: f'(x) = 3x² - 6x = 0  ⇒  x = 0 hoặc x = 2 (hoặc bấm 'Nói ra công thức' ở trên)"
              value={text}
              onChange={(e) => { stopListening(); setText(e.target.value); }}
              onKeyDown={handleKeyDown}
            />
            <div className="math-convert-actions">
              <button type="button" className="btn btn-secondary btn-sm" disabled={!text.trim()}
                onClick={convertTypedSpeech}>Chuyển lời đọc thành công thức</button>
              <span>Gõ câu đọc hoặc nói bằng micro; có thể sửa kết quả trước khi chèn.</span>
            </div>
          </div>

          {/* Bàn phím ký hiệu Toán học */}
          <div className="math-keyboard-panel">
            {MATH_CATEGORIES.map((cat) => (
              <div key={cat.name} className="math-key-group">
                <span className="math-key-group-label">{cat.name}</span>
                <div className="math-keys-grid">
                  {cat.symbols.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      className="math-key-btn"
                      onClick={() => handleInsertSymbol(sym)}
                      title={`Chèn ${sym}`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Live Preview */}
          {text.trim() && (
            <div className="math-live-preview-box">
              <span className="preview-mini-tag">
                <EyeOutlined style={{ fontSize: '13px', color: 'var(--brand-primary)' }} /> Bản xem trước trên bài giảng:
              </span>
              <div className="preview-rendered-math">
                {text}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer flex items-center justify-between">
          <span className="text-xs text-muted">
            Mẹo: Nhấn <strong>Ctrl + Enter</strong> để {isEditing ? 'lưu nhanh' : 'chèn nhanh'}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!text.trim()}
              onClick={() => handleSubmit()}
            >
              <span>{isEditing ? 'Lưu thay đổi' : 'Chèn vào bài giảng'}</span>
              <CornerDownLeft size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
