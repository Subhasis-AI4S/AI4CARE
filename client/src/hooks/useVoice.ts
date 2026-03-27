import { useState, useEffect, useRef, useCallback } from 'react';

// Extend Window interface to include webkitSpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface UseVoiceResult {
  isListening: boolean;
  transcript: string;
  startListening: (initialText?: string) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  supported: boolean;
}

export const useVoice = (onResultUpdate?: (newTranscript: string) => void, language: string = 'en'): UseVoiceResult => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  
  const onResultUpdateRef = useRef(onResultUpdate);
  const recognitionRef = useRef<any>(null);
  const interimTranscriptRef = useRef<string>('');
  const finalTranscriptRef = useRef<string>('');
  
  // Update the ref whenever the callback changes without re-triggering the main effect
  useEffect(() => {
    onResultUpdateRef.current = onResultUpdate;
  }, [onResultUpdate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSupported(true);
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        // Map app language to speech recognition language
        const langMap: { [key: string]: string } = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'bn': 'bn-IN'
        };
        recognitionRef.current.lang = langMap[language] || 'en-US';
        
        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscriptRef.current += event.results[i][0].transcript + ' ';
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          interimTranscriptRef.current = interimTranscript;
          const currentTranscript = (finalTranscriptRef.current + interimTranscript).trim();
          setTranscript(currentTranscript);
          if (onResultUpdateRef.current) {
            onResultUpdateRef.current(currentTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, [language]);

  const startListening = useCallback((initialText?: string) => {
    if (recognitionRef.current && !isListening) {
      const seed = initialText ? initialText.trim() + ' ' : '';
      finalTranscriptRef.current = seed;
      setTranscript(seed.trim());
      
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    if (onResultUpdate) {
        onResultUpdate('');
    }
  }, [onResultUpdate]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    supported
  };
};
