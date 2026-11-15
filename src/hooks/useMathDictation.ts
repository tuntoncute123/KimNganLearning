import { useCallback, useEffect, useRef, useState } from 'react';
import { isSpeechRecognitionSupported, parseSpeechToMath } from '../utils/speechToMath';

interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function useMathDictation(onText: (value: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      // Ignore delayed results after manual edits, insertion, closing or a new session.
      recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
      try { recognition.stop(); } catch { /* Already ended. */ }
    }
    setIsListening(false);
  }, []);

  const reset = useCallback(() => { stop(); setTranscript(''); setError(null); }, [stop]);
  useEffect(() => stop, [stop]);

  const start = useCallback((baseText: string) => {
    if (recognitionRef.current) return;
    if (!isSpeechRecognitionSupported()) {
      setError('Trình duyệt chưa hỗ trợ nhận diện giọng nói. Bạn có thể gõ câu đọc rồi bấm “Chuyển lời đọc thành công thức”.');
      return;
    }
    const speechWindow = window as SpeechWindow;
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor) return;
    setError(null);
    setTranscript('');
    setIsListening(true);
    const prefix = baseText ? baseText + (/\s$/u.test(baseText) ? '' : ' ') : '';
    let previousSpeech = '';
    let currentSpeech = '';
    try {
      const recognition = new Constructor();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';
      recognition.onresult = event => {
        if (recognitionRef.current !== recognition) return;
        currentSpeech = Array.from(event.results).map(result => result[0].transcript.trim()).filter(Boolean).join(' ');
        const fullSpeech = [previousSpeech, currentSpeech].filter(Boolean).join(' ');
        setTranscript(fullSpeech);
        onText(prefix + parseSpeechToMath(fullSpeech));
      };
      recognition.onerror = event => {
        if (event.error === 'no-speech') return;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError('Micro chưa được cấp quyền. Cho phép micro trong trình duyệt hoặc gõ câu đọc để chuyển đổi.');
        } else if (event.error !== 'aborted') {
          setError(`Không thể tiếp tục nhận diện (${event.error}). Nội dung đã đọc được giữ lại; bấm micro để thử lại.`);
        }
        stop();
      };
      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        // Recognition results start at zero after reconnecting. Reparse all speech so
        // "a cộng b" + a pause + "tất cả bình" still produces (a + b)².
        previousSpeech = [previousSpeech, currentSpeech].filter(Boolean).join(' ');
        currentSpeech = '';
        try { recognition.start(); }
        catch { stop(); setError('Micro đã dừng. Nội dung được giữ lại; bấm micro để tiếp tục.'); }
      };
      recognition.start();
    } catch {
      stop();
      setError('Không thể khởi động micro. Bạn có thể gõ câu đọc để chuyển đổi hoặc thử lại.');
    }
  }, [onText, stop]);

  return { isListening, transcript, error, start, stop, reset, setError, setTranscript };
}
