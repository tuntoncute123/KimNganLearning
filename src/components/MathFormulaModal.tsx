import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { parseSpeechToMath, isSpeechRecognitionSupported } from '../utils/speechToMath';

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

const VOICE_EXAMPLES = [
  { speech: 'căn bậc hai của x cộng 1 bằng 5', math: '√(x + 1) = 5' },
  { speech: 'denta bằng b bình phương trừ 4ac', math: 'Δ = b² - 4ac' },
  { speech: 'x bình phương trừ 4x cộng 3 bằng 0', math: 'x² - 4x + 3 = 0' },
  { speech: 'suy ra x lớn hơn hoặc bằng 0', math: '⇒ x ≥ 0' },
];

export const MathFormulaModal: React.FC<MathFormulaModalProps> = ({
  isOpen,
  onClose,
  onInsertFormula,
  initialText = '',
  isEditing = false,
}) => {
  const [text, setText] = useState(initialText);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef<boolean>(false);
  const baseTextRef = useRef<string>('');

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // bỏ qua nếu đã dừng
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      setVoiceError('Trình duyệt hiện tại chưa hỗ trợ Web Speech API. Vui lòng sử dụng Google Chrome hoặc Microsoft Edge.');
      return;
    }

    setVoiceError(null);
    baseTextRef.current = text ? text + (text.endsWith(' ') ? '' : ' ') : '';
    shouldListenRef.current = true;

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscripts = '';
        let currentInterim = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscripts += res[0].transcript + ' ';
          } else {
            currentInterim += res[0].transcript;
          }
        }

        const fullSpeech = (finalTranscripts + currentInterim).trim();
        setInterimTranscript(fullSpeech);

        if (fullSpeech) {
          const parsed = parseSpeechToMath(fullSpeech);
          setText(baseTextRef.current + parsed);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setVoiceError('Trình duyệt chưa được cấp quyền Microphone. Hãy bấm biểu tượng ổ khóa cạnh thanh địa chỉ để cho phép micro.');
          stopListening();
        } else if (event.error === 'no-speech') {
          // Chưa nghe thấy tiếng, tiếp tục lắng nghe không tắt
        } else if (event.error !== 'aborted') {
          setVoiceError(`Lỗi nhận diện âm thanh: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // Tự động khởi động lại nếu giáo viên chưa chủ động tắt (để duy trì continuous stream)
        if (shouldListenRef.current) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Lỗi khởi tạo SpeechRecognition:', err);
      setVoiceError('Không thể khởi động micro. Vui lòng thử lại.');
      setIsListening(false);
    }
  }, [text, stopListening]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setVoiceError(null);
      setInterimTranscript('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [isOpen, initialText, stopListening]);

  if (!isOpen) return null;

  const handleInsertSymbol = (sym: string) => {
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
      <div className="modal-container math-formula-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="math-modal-icon-badge">
              <Type size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="modal-title">
                {isEditing ? 'Chỉnh Sửa Công Thức Toán Học' : 'Chèn Công Thức & Lời Giải Toán Học'}
              </h3>
              <p className="text-xs text-muted">
                {isEditing
                  ? 'Chỉnh sửa trực tiếp bằng bàn phím hoặc bấm micro để nói bổ sung/thay thế'
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
            <label className="text-xs font-semibold text-muted">
              Nội dung công thức / lời giải:
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`voice-mic-btn ${isListening ? 'is-listening' : ''}`}
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
                  onClick={() => setText('')}
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
                {interimTranscript ? (
                  <div className="voice-interim-preview">
                    Đang nghe: <em>"{interimTranscript}"</em>
                  </div>
                ) : (
                  <div className="voice-listening-hint">
                    Thử nói: "căn bậc hai của x cộng 1 bằng 5" hoặc "denta bằng b bình phương trừ 4ac"...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Thông báo lỗi Micro nếu có */}
          {voiceError && (
            <div className="voice-error-alert">
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
                <span>💡 Hướng dẫn nói tự nhiên bằng tiếng Việt (100% tự động nhận diện):</span>
                <button
                  type="button"
                  className="voice-help-close-btn"
                  onClick={() => setShowVoiceHelp(false)}
                >
                  Đóng
                </button>
              </div>
              <div className="voice-help-grid">
                {VOICE_EXAMPLES.map((ex, idx) => (
                  <div key={idx} className="voice-example-item">
                    <span className="example-speech">🗣️ "{ex.speech}"</span>
                    <span className="example-arrow">➔</span>
                    <span className="example-math font-mono">{ex.math}</span>
                  </div>
                ))}
              </div>
              <p className="voice-help-footer">
                Hỗ trợ đầy đủ: Căn (√, ∛), Mũ (², ³, ⁿ), Ký hiệu Hy Lạp (Δ, α, β, π, θ), Bất đẳng thức (≥, ≤, ≠), Vectơ (→), Vuông góc (⊥), Song song (∥), Tích phân (∫)...
              </p>
            </div>
          )}

          {/* Ô nhập công thức */}
          <div className="math-input-wrapper">
            <textarea
              ref={inputRef}
              className="math-textarea"
              rows={3}
              placeholder="Ví dụ: Ta có: f'(x) = 3x² - 6x = 0  ⇒  x = 0 hoặc x = 2 (hoặc bấm 'Nói ra công thức' ở trên)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
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
