import { useCallback, useEffect, useRef, useState } from "react";

let SpeechModule = null;
let useSpeechRecognitionEvent = () => {};

try {
  const speech = require("expo-speech-recognition");
  SpeechModule = speech.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speech.useSpeechRecognitionEvent;
} catch (error) {
  // The native module isn't available in Expo Go or before a dev build.
}

const DEFAULT_ERROR =
  "Voice input is not available on this device. Try again later.";

export function useSpeechToText({
  language = "en-US",
  voiceCommandMode = false,
  onTranscript,
  onCommand,
} = {}) {
  const [listening, setListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [speechError, setSpeechError] = useState("");

  const transcriptRef = useRef(onTranscript);
  const commandRef = useRef(onCommand);
  const voiceModeRef = useRef(voiceCommandMode);
  const languageRef = useRef(language);

  useEffect(() => {
    transcriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    commandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    voiceModeRef.current = voiceCommandMode;
  }, [voiceCommandMode]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useSpeechRecognitionEvent("start", () => {
    setListening(true);
    setSpeechError("");
  });

  useSpeechRecognitionEvent("end", () => {
    setListening(false);
    setLiveTranscript("");
  });

  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);
    setLiveTranscript("");
    setSpeechError(event?.error ?? "Voice input failed. Try again.");
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event?.results?.[0]?.transcript?.trim();
    if (!transcript) return;

    if (voiceModeRef.current) {
      if (event?.isFinal) {
        commandRef.current?.(transcript);
      }
      return;
    }

    if (event?.isFinal) {
      transcriptRef.current?.(transcript);
      setLiveTranscript("");
    } else {
      setLiveTranscript(transcript);
    }
  });

  const clearError = useCallback(() => setSpeechError(""), []);

  const stopListening = useCallback(() => {
    try {
      SpeechModule?.stop?.();
    } catch (error) {
      // Ignore teardown errors for unsupported platforms.
    }
  }, []);

  const toggleListening = useCallback(async () => {
    try {
      if (!SpeechModule) {
        setSpeechError(
          "Voice input requires a development build (not Expo Go).",
        );
        return;
      }

      if (listening) {
        SpeechModule.stop();
        return;
      }

      const permission = await SpeechModule.requestPermissionsAsync();
      if (!permission?.granted) {
        setSpeechError("Microphone permission not granted.");
        return;
      }

      setSpeechError("");
      setLiveTranscript("");
      SpeechModule.start({
        lang: languageRef.current || "en-US",
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
        addsPunctuation: true,
      });
    } catch (error) {
      setSpeechError(DEFAULT_ERROR);
    }
  }, [listening]);

  useEffect(
    () => () => {
      stopListening();
    },
    [stopListening],
  );

  return {
    listening,
    liveTranscript,
    speechError,
    toggleListening,
    stopListening,
    clearError,
  };
}
