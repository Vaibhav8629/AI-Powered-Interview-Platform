import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import api, { getApiErrorMessage } from "../services/api";
import { getInterviewerVideo, getInterviewerVoice } from "../services/interviewerHelpers";

/**
 * AI Smart Interview — Full-screen Interview Screen
 * Single-file React component. Plain CSS-in-JS via a <style> tag (no Tailwind).
 * Replace the placeholder <img src="/interviewer-image.jpg" /> with your real asset.
 *
 * Layout: exact 50/50 split, no outer wrapping card.
 * LEFT  = full-bleed interviewer image (50vw x 100vh)
 * RIGHT = independent workspace (status card, question, answer, feedback)
 */

// questionTime (seconds) can later come from interview config/API per question.
// Falls back to 120s (2:00) if a question doesn't specify one.
const DEFAULT_QUESTION_TIME = 120;
function formatTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function normalizeQuestion(question, index) {
  return {
    id: question?._id || index + 1,
    text: question?.question || question?.text || "",
    answer: question?.answer || "",
    questionTime: question?.questionTime || DEFAULT_QUESTION_TIME,
    feedback: question?.feedback || "",
    score: question?.score ?? null,
  };
}

export default function InterviewScreen() {
  const { id } = useParams();
  const [interview, setInterview] = useState(null);
  const [loadingInterview, setLoadingInterview] = useState(Boolean(id));
  const [interviewError, setInterviewError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] = useState(false);
  // interviewerGender drives BOTH the video and the TTS voice — never random.
  // Defaults to "male"; can be toggled by the user via the gender switcher.
  const [interviewerGender, setInterviewerGender] = useState("male");
  const interviewerVideo = getInterviewerVideo(interviewerGender);
  const [speechVoices, setSpeechVoices] = useState([]);

  const currentAnswerRef = useRef("");
  const recognitionRef = useRef(null);
  const finalSpeechRef = useRef("");
  const interimSpeechRef = useRef("");
  const speechBaseRef = useRef("");

  const interviewQuestions = Array.isArray(interview?.questions)
    ? interview.questions.map((question, index) => normalizeQuestion(question, index))
    : [];

  const currentQuestion = interviewQuestions[currentIndex] || null;
  const currentQuestionText = currentQuestion?.text?.trim() || "";
  const currentQuestionSpeechKey = currentQuestion
    ? `${currentQuestion.id}:${currentQuestionText}`
    : "";
  const allottedTime = currentQuestion?.questionTime || DEFAULT_QUESTION_TIME;
  const isLast = currentIndex === Math.max(interviewQuestions.length - 1, 0);

  const [secondsLeft, setSecondsLeft] = useState(allottedTime);
  const intervalRef = useRef(null);
  const videoRef = useRef(null);
  const utteranceRef = useRef(null);
  // Refs hold the resolved voices so speakQuestion always reads the latest selection
  // even if called from a stale closure.
  const maleVoiceRef = useRef(null);
  const femaleVoiceRef = useRef(null);
  // Tracks the current interviewer gender inside callbacks (avoids stale closures)
  const interviewerGenderRef = useRef("male");
  const speechTokenRef = useRef(0);
  const lastSpokenQuestionKeyRef = useRef("");
  const mountedRef = useRef(true);
  const speechSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function";
  const speechRecognitionSupported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Keep interviewerGenderRef in sync so callbacks always read current gender
  useEffect(() => {
    interviewerGenderRef.current = interviewerGender;
  }, [interviewerGender]);

  // Re-resolve voices whenever available voices or gender changes
  useEffect(() => {
    maleVoiceRef.current = getInterviewerVoice("male", speechVoices);
    femaleVoiceRef.current = getInterviewerVoice("female", speechVoices);
    console.log("Voice resolved — male:", maleVoiceRef.current?.name, "| female:", femaleVoiceRef.current?.name);
  }, [speechVoices]);

  const cancelCurrentSpeech = useCallback(() => {
    if (!speechSupported) {
      return;
    }

    speechTokenRef.current += 1;

    // Stop any in-flight utterance handlers and clear ref
    try {
      if (utteranceRef.current) {
        utteranceRef.current.onstart = null;
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        utteranceRef.current = null;
      }
    } catch (e) {
      // ignore
    }

    // Pause and reset video when cancelling speech
    pauseInterviewVideo(true);

    window.speechSynthesis.cancel();

    if (mountedRef.current) {
      setIsSpeaking(false);
    }
  }, [speechSupported]);

  /**
   * handleGenderSwitch — user picks a different interviewer gender.
   * Cancels any in-flight speech, resets the video, and forces the next
   * question to re-speak with the new voice.
   */
  const handleGenderSwitch = useCallback((newGender) => {
    if (newGender === interviewerGenderRef.current) return;
    cancelCurrentSpeech();          // stops TTS + pauses/resets video
    lastSpokenQuestionKeyRef.current = ""; // force re-speak on next render
    setInterviewerGender(newGender);
  }, [cancelCurrentSpeech]);

  const playInterviewVideo = useCallback(async () => {
    const videoElement = videoRef.current;

    if (!videoElement) {
      console.log("Video play attempted but video element missing");
      return;
    }

    try {
      console.log(`Playing ${getInterviewerVideo(interviewerGenderRef.current)} (${interviewerGenderRef.current} interviewer)`);
      // Ensure the video has data / can play before trying to play
      if (videoElement.readyState < 2) {
        await new Promise((resolve) => {
          const handler = () => resolve();
          videoElement.addEventListener("canplay", handler, { once: true });
        });
      }

      console.log("Video play attempted");
      await videoElement.play();
      console.log("Video playing");
    } catch (err) {
      console.log("Video play failed:", err && (err.message || err));
    }
  }, []);

  const pauseInterviewVideo = useCallback((reset = false) => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        console.log(`Paused video (${interviewerGenderRef.current} interviewer)`);

        if (reset) {
          try {
            // only set currentTime if metadata is available
            if (videoRef.current.readyState > 0) {
              videoRef.current.currentTime = 0;
              console.log("Video reset to 0");
            } else {
              // wait for loadedmetadata then reset
              const h = () => {
                try {
                  videoRef.current.currentTime = 0;
                  console.log("Video reset to 0 (onloadedmetadata)");
                } catch (e) {}
                videoRef.current.removeEventListener("loadedmetadata", h);
              };
              videoRef.current.addEventListener("loadedmetadata", h);
            }
          } catch (e) {
            console.log("Video reset failed:", e && (e.message || e));
          }
        }
      } catch (e) {
        console.log("Video pause failed:", e && (e.message || e));
      }
    }
  }, []);

  const speakQuestion = useCallback(
    (questionText, questionKey, options = {}) => {
      const text = questionText?.trim();

      console.log("speakQuestion called", { questionKey, textPresent: !!text, speechSupported });

      if (!speechSupported || !text) {
        console.log("speakQuestion abort: no support or empty text", { speechSupported, text });
        return false;
      }

      const { force = false } = options;

      if (!force && questionKey && lastSpokenQuestionKeyRef.current === questionKey) {
        return false;
      }

      // Reserve the key immediately so duplicate rapid calls won't proceed
      lastSpokenQuestionKeyRef.current = questionKey || text;

      cancelCurrentSpeech();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Track the current utterance so we can remove handlers if cancelled
      utteranceRef.current = utterance;

      const gender = interviewerGenderRef.current;
      console.log("Selected interviewer gender:", gender);

      // Use ref-cached voice if available, otherwise resolve fresh from voices list
      let selectedVoice = gender === "female" ? femaleVoiceRef.current : maleVoiceRef.current;
      if (!selectedVoice) {
        selectedVoice = getInterviewerVoice(gender, speechVoices);
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`Selected ${gender} voice:`, selectedVoice.name);
      } else {
        console.log("No gender-matched voice found; using browser default");
      }

      const speechToken = speechTokenRef.current;
      lastSpokenQuestionKeyRef.current = questionKey || text;

      utterance.onstart = async () => {
        if (!mountedRef.current || speechToken !== speechTokenRef.current) {
          return;
        }

        console.log("TTS started");
        setIsSpeaking(true);
        console.log(`Playing video for ${interviewerGenderRef.current} interviewer`);
        await playInterviewVideo();
      };

      utterance.onend = () => {
        if (!mountedRef.current || speechToken !== speechTokenRef.current) {
          return;
        }

        console.log("TTS ended");
        setIsSpeaking(false);
        // clear tracked utterance
        try {
          if (utteranceRef.current === utterance) {
            utteranceRef.current = null;
          }
        } catch (e) {}
        pauseInterviewVideo(true);
      };

      utterance.onpause = () => {
        if (!mountedRef.current || speechToken !== speechTokenRef.current) {
          return;
        }
        console.log("TTS paused");
        setIsSpeaking(false);
        pauseInterviewVideo(true);
      };
      utterance.onerror = (ev) => {
        if (!mountedRef.current || speechToken !== speechTokenRef.current) {
          return;
        }

        console.log("TTS error", ev);
        setIsSpeaking(false);
        try {
          if (utteranceRef.current === utterance) {
            utteranceRef.current = null;
          }
        } catch (e) {}
        pauseInterviewVideo(true);
      };

      console.log("about to call speechSynthesis.speak");
      window.speechSynthesis.speak(utterance);

      // Fallback: ensure video starts if speaking begins but `onstart` didn't fire.
      setTimeout(() => {
        try {
          if (window.speechSynthesis.speaking) {
            console.log("speechSynthesis.speaking detected fallback - starting video");
            playInterviewVideo();
          }
        } catch (e) {}
      }, 60);

      console.log("speechSynthesis.speak returned");
      return true;
    },
    [cancelCurrentSpeech, pauseInterviewVideo, playInterviewVideo, speechVoices, speechSupported]
  );

  // Reset + restart countdown whenever the active question changes.
  useEffect(() => {
    setSecondsLeft(allottedTime);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, allottedTime]);

  // Handle timeout (0:00 reached) — placeholder hook for auto-advance / lock input, etc.
  useEffect(() => {
    if (secondsLeft === 0) {
      // Time's up for this question. Extend here (e.g. auto-submit) as needed.
    }
  }, [secondsLeft]);

  useEffect(() => {
    if (!speechSupported) {
      return undefined;
    }

    const updateVoices = () => {
      const vs = window.speechSynthesis.getVoices() || [];
      console.log("voiceschanged: found voices:", vs.map((v) => v.name));
      setSpeechVoices(vs);
      // maleVoiceRef / femaleVoiceRef are updated in the separate effect above
    };

    updateVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", updateVoices);

    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", updateVoices);
    };
  }, [speechSupported]);

  useEffect(() => {
    currentAnswerRef.current = currentAnswer;
  }, [currentAnswer]);

  useEffect(() => {
    setSpeechRecognitionAvailable(Boolean(speechRecognitionSupported));
  }, [speechRecognitionSupported]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;

      // Ensure any active speech and handlers are cancelled/cleaned
      try {
        cancelCurrentSpeech();
      } catch (e) {
        if (speechSupported) {
          window.speechSynthesis.cancel();
        }
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onresult = null;
          recognitionRef.current.stop();
        } catch (e) {
          console.log("Speech recognition cleanup error:", e);
        }
      }

      pauseInterviewVideo();
    };
  }, [cancelCurrentSpeech, pauseInterviewVideo, speechSupported]);

  const stopSpeechRecognition = useCallback((resetSession = false) => {
    const recognition = recognitionRef.current;

    if (recognition) {
      try {
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
        recognition.stop();
      } catch (error) {
        console.log("Speech recognition stop error:", error);
      }
      recognitionRef.current = null;
    }

    if (resetSession) {
      finalSpeechRef.current = "";
      interimSpeechRef.current = "";
      speechBaseRef.current = "";
    }

    setIsListening(false);
  }, []);

  const appendFinalTranscript = useCallback((existing, incoming) => {
    const current = (existing || "").trim();
    const next = (incoming || "").trim();

    if (!next) {
      return current;
    }

    if (!current) {
      return next;
    }

    if (current === next || current.endsWith(next)) {
      return current;
    }

    if (next.startsWith(current)) {
      return next;
    }

    const currentWords = current.split(/\s+/);
    const nextWords = next.split(/\s+/);

    if (
      nextWords.length >= currentWords.length &&
      nextWords.slice(0, currentWords.length).join(" ") === current
    ) {
      return next;
    }

    if (
      currentWords.length > nextWords.length &&
      currentWords.slice(0, nextWords.length).join(" ") === next
    ) {
      return current;
    }

    return `${current} ${next}`.trim();
  }, []);

  useEffect(() => {
    stopSpeechRecognition(true);
  }, [currentQuestionSpeechKey, stopSpeechRecognition]);

  useEffect(() => {
    pauseInterviewVideo(true);
  }, [pauseInterviewVideo]);

  // Poll speechSynthesis.speaking to ensure video mirrors TTS state across browsers
  useEffect(() => {
    if (!speechSupported) return undefined;

    let lastSpeaking = false;
    const interval = setInterval(() => {
      try {
        const speaking = !!window.speechSynthesis.speaking;

        if (speaking && !lastSpeaking) {
          lastSpeaking = true;
          console.log("poll: TTS speaking detected -> play video");
          playInterviewVideo();
        } else if (!speaking && lastSpeaking) {
          lastSpeaking = false;
          console.log("poll: TTS stopped -> pause video");
          pauseInterviewVideo(true);
        }
      } catch (e) {
        // ignore
      }
    }, 120);

    return () => clearInterval(interval);
  }, [speechSupported, playInterviewVideo, pauseInterviewVideo]);

  // When the interviewer video source changes (gender switch), force the video
  // element to reload the new source so it's ready to play immediately.
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.pause();
    videoEl.load(); // reload with new src
    console.log("Video source reloaded for:", interviewerVideo);
  }, [interviewerVideo]);

  useEffect(() => {
    console.log("question-effect: currentQuestionKey=", currentQuestionSpeechKey);

    if (!currentQuestionText) {
      console.log("question-effect: no question text, cancelling speech");
      cancelCurrentSpeech();
      lastSpokenQuestionKeyRef.current = "";
      return;
    }

    console.log("question-effect: speaking question");
    speakQuestion(currentQuestionText, currentQuestionSpeechKey);
  }, [cancelCurrentSpeech, currentQuestionSpeechKey, currentQuestionText, speakQuestion]);

  // When the interviewer gender changes mid-session, re-speak the current
  // question using the new voice (lastSpokenQuestionKeyRef was already cleared
  // by handleGenderSwitch, so speakQuestion won't skip it).
  useEffect(() => {
    if (!currentQuestionText) return;
    console.log("gender-effect: re-speaking question with new gender:", interviewerGender);
    speakQuestion(currentQuestionText, currentQuestionSpeechKey, { force: true });
    // We intentionally only re-run on interviewerGender — not on every question change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewerGender]);

  const handleAnswerChange = (value) => {
    setCurrentAnswer(value);
    currentAnswerRef.current = value;
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = value;
      return next;
    });
  };

  const buildSpeechAnswer = useCallback((baseValue, finalText, interimText) => {
    const base = (baseValue || "").trim();
    const finalSegment = (finalText || "").trim();
    const interimSegment = (interimText || "").trim();
    const speechText = [finalSegment, interimSegment].filter(Boolean).join(" ").trim();
    return [base, speechText].filter(Boolean).join(" ").trim();
  }, []);

  const handleSpeechToggle = useCallback(() => {
    if (!speechRecognitionAvailable || !speechRecognitionSupported) {
      return;
    }

    if (recognitionRef.current) {
      stopSpeechRecognition(true);
      return;
    }

    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setSpeechRecognitionAvailable(false);
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    finalSpeechRef.current = "";
    interimSpeechRef.current = "";
    speechBaseRef.current = currentAnswerRef.current.trim();

    recognition.onstart = () => {
      console.log("Speech recognition started");
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      console.log("Speech result received", event.results);

      let latestInterimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript?.trim();

        if (!transcript) {
          continue;
        }

        if (result.isFinal) {
          console.log("Final transcript:", transcript);
          finalSpeechRef.current = appendFinalTranscript(finalSpeechRef.current, transcript);
        } else {
          console.log("Interim transcript:", transcript);
          latestInterimTranscript = transcript;
        }
      }

      interimSpeechRef.current = latestInterimTranscript;

      const updatedValue = buildSpeechAnswer(
        speechBaseRef.current,
        finalSpeechRef.current,
        interimSpeechRef.current
      );

      setCurrentAnswer(updatedValue);
      currentAnswerRef.current = updatedValue;
      setAnswers((prev) => {
        const next = [...prev];
        next[currentIndex] = updatedValue;
        return next;
      });
    };

    recognition.onend = () => {
      console.log("Speech recognition stopped");
      setIsListening(false);
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      interimSpeechRef.current = "";
      speechBaseRef.current = currentAnswerRef.current.trim();
    };

    recognition.onerror = (event) => {
      console.log("Speech recognition error:", event?.error || event);
      setIsListening(false);
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      interimSpeechRef.current = "";
      speechBaseRef.current = currentAnswerRef.current.trim();
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.log("Speech recognition start error:", error);
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [appendFinalTranscript, buildSpeechAnswer, currentIndex, speechRecognitionAvailable, speechRecognitionSupported, stopSpeechRecognition]);

  const handleNextQuestion = useCallback(async () => {
    if (!currentQuestion || submittingAnswer) {
      return;
    }

    stopSpeechRecognition(true);
    setSubmittingAnswer(true);
    setInterviewError("");

    try {
      if (currentAnswer.trim()) {
        await api.post(`/api/interview/${id}/answer`, {
          questionId: currentQuestion.id,
          answer: currentAnswer,
        });
      }

      if (isLast) {
        await api.post(`/api/interview/${id}/complete`);
        setInterview((prev) => (prev ? { ...prev, status: "completed" } : prev));
        return;
      }

      await api.post(`/api/interview/${id}/next-question`);
      setCurrentIndex((prev) => Math.min(prev + 1, interviewQuestions.length - 1));
    } catch (error) {
      setInterviewError(getApiErrorMessage(error, "Unable to submit answer."));
    } finally {
      setSubmittingAnswer(false);
    }
  }, [currentAnswer, currentQuestion, id, interviewQuestions.length, isLast, stopSpeechRecognition, submittingAnswer]);

  // Urgency styling thresholds
  const urgency =
    secondsLeft <= 10 ? "critical" : secondsLeft <= 30 ? "low" : "normal";

  const progressRatio = allottedTime > 0 ? secondsLeft / allottedTime : 0;
  const ringDegrees = Math.max(0, Math.min(360, progressRatio * 360));

  useEffect(() => {
    if (!id) {
      setInterview(null);
      setInterviewError("Unable to load interview details.");
      setLoadingInterview(false);
      return;
    }

    let active = true;

    const loadInterview = async () => {
      setLoadingInterview(true);
      setInterviewError("");

      try {
        const response = await api.get(`/api/interview/${id}`);
        const data = response?.data?.interview || response?.data?.data || response?.data || null;

        if (!active) {
          return;
        }

        setInterview(data);
        const questions = Array.isArray(data?.questions)
          ? data.questions.map((question, index) => normalizeQuestion(question, index))
          : [];
        const nextIndex = Math.min(Number(data?.currentQuestion || 0), Math.max(questions.length - 1, 0));
        setCurrentIndex(nextIndex);
        setAnswers(questions.map((question) => question.answer || ""));
        setCurrentAnswer(questions[nextIndex]?.answer || "");
      } catch (error) {
        if (!active) {
          return;
        }

        setInterview(null);
        setInterviewError(getApiErrorMessage(error, "Unable to load interview details."));
      } finally {
        if (active) {
          setLoadingInterview(false);
        }
      }
    };

    loadInterview();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    setCurrentAnswer(answers[currentIndex] || "");
  }, [answers, currentIndex]);

  const interviewTopics = Array.isArray(interview?.topics) ? interview.topics : [];

  return (
    <div className="ai-interview-screen">
      <style>{`
        * { box-sizing: border-box; }

        html, body, #root {
          margin: 0;
          padding: 0;
        }

        .ai-interview-screen {
          width: 100vw;
          height: 100vh;
          display: flex;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            "Helvetica Neue", Arial, sans-serif;
          overflow: hidden;
        }

        /* ---------- LEFT: FULL-BLEED INTERVIEWER IMAGE ---------- */
        .interview-left {
          width: 50vw;
          height: 100vh;
          flex-shrink: 0;
          background: #e5e7eb;
          position: relative;
        }

        .interview-left img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .interviewer-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* ---------- GENDER SWITCHER ---------- */
        .gender-switcher {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 9999px;
          padding: 4px;
          gap: 4px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
          z-index: 10;
        }

        .gender-btn {
          border: none;
          border-radius: 9999px;
          padding: 7px 18px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
          background: transparent;
          color: rgba(255, 255, 255, 0.85);
          white-space: nowrap;
        }

        .gender-btn.active {
          background: #ffffff;
          color: #065f46;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.14);
        }

        .gender-btn:not(.active):hover {
          background: rgba(255, 255, 255, 0.22);
          color: #ffffff;
        }

        /* ---------- RIGHT: INDEPENDENT WORKSPACE ---------- */
        .interview-right {
          width: 50vw;
          height: 100vh;
          background: #f7f8f9;
          padding: 24px 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
          position: relative;
        }

        .right-top-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .interview-info {
          flex: 1;
          min-width: 0;
          background: linear-gradient(180deg, #ffffff 0%, #f8fffc 100%);
          border: 1px solid #d1fae5;
          border-radius: 14px;
          padding: 14px 16px;
          box-shadow: 0 1px 8px rgba(15, 23, 42, 0.04);
        }

        .interview-info.loading,
        .interview-info.error {
          display: flex;
          align-items: center;
          min-height: 88px;
          font-size: 13px;
          color: #6b7280;
        }

        .interview-info.error {
          color: #b45309;
          background: #fffbeb;
          border-color: #fcd34d;
        }

        .interview-role {
          font-size: 22px;
          font-weight: 700;
          line-height: 1.15;
          color: #059669;
          margin: 0;
        }

        .interview-meta {
          margin-top: 6px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px 10px;
          font-size: 12.5px;
          color: #374151;
        }

        .interview-meta span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .interview-difficulty {
          margin-top: 6px;
          font-size: 12.5px;
          color: #374151;
        }

        .interview-difficulty strong,
        .interview-topics-label {
          color: #065f46;
          font-weight: 600;
        }

        .interview-topics {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
        }

        .interview-topics-label {
          font-size: 12.5px;
          margin-right: 2px;
        }

        .interview-topic-chip {
          display: inline-flex;
          align-items: center;
          border-radius: 9999px;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #047857;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
        }

        /* ---------- STATUS CARD: SMALL, TOP-RIGHT ---------- */
        .status-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #eef0f2;
          box-shadow: 0 1px 8px rgba(15, 23, 42, 0.05);
          padding: 12px 16px;
          width: 168px;
          flex-shrink: 0;
        }

        .status-heading {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
          margin: 0 0 8px 0;
          text-align: right;
        }

        .status-timer-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .timer-ring {
          --ring-color: #10b981;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: conic-gradient(
            var(--ring-color) calc(var(--progress) * 1deg),
            #e5e7eb 0deg
          );
          transition: background 0.3s linear;
        }

        .timer-ring.low {
          --ring-color: #d97706;
        }

        .timer-ring.critical {
          --ring-color: #dc2626;
        }

        .timer-ring-inner {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #ffffff;
        }

        .timer-text {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          font-variant-numeric: tabular-nums;
        }

        .timer-text.low {
          color: #d97706;
        }

        .timer-text.critical {
          color: #dc2626;
        }

        .status-question-count {
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
        }

        .status-question-count span {
          color: #10b981;
        }

        /* ---------- QUESTION CARD ---------- */
        .question-card {
          background: #ffffff;
          border: 1px solid #eef0f2;
          border-radius: 14px;
          box-shadow: 0 1px 8px rgba(15, 23, 42, 0.04);
          padding: 18px 20px;
          flex-shrink: 0;
        }

        .question-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .question-of {
          font-size: 12px;
          color: #9ca3af;
          margin: 0 0 6px 0;
        }

        .question-text {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          line-height: 1.5;
          margin: 0;
        }

        .read-question-btn {
          flex-shrink: 0;
          border: 1px solid #a7f3d0;
          background: #ecfdf5;
          color: #047857;
          border-radius: 9999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease, background 0.15s ease;
          white-space: nowrap;
        }

        .read-question-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #d1fae5;
        }

        .read-question-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .read-question-btn.speaking {
          background: #d1fae5;
          border-color: #6ee7b7;
        }

        .read-question-fallback {
          margin: 8px 0 0 0;
          font-size: 12px;
          color: #6b7280;
        }

        /* ---------- ANSWER AREA ---------- */
        .answer-input-wrap {
          position: relative;
          width: 100%;
        }

        .answer-area {
          flex: 1;
          min-height: 140px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 18px 52px 18px 20px;
          font-size: 14px;
          color: #374151;
          line-height: 1.6;
          resize: none;
          width: 100%;
          font-family: inherit;
        }

        .answer-area:focus {
          outline: none;
          border-color: #10b981;
        }

        .mic-button {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #374151;
          font-size: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);
        }

        .mic-button:hover:not(:disabled) {
          border-color: #10b981;
          color: #047857;
        }

        .mic-button.listening {
          background: #fee2e2;
          border-color: #ef4444;
          color: #b91c1c;
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.12);
        }

        .mic-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .speech-warning {
          margin-top: 8px;
          font-size: 12px;
          color: #b45309;
        }

        /* ---------- AI FEEDBACK ---------- */
        .feedback-card {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 14px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;
        }

        .feedback-text {
          font-size: 13px;
          color: #047857;
          margin: 0;
        }

        .next-question-btn {
          width: 100%;
          background: linear-gradient(90deg, #10b981, #0d9488);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          padding: 14px 0;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.15s ease;
        }

        .next-question-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .next-question-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ---------- RESPONSIVE ---------- */
        @media (max-width: 900px) {
          .ai-interview-screen {
            flex-direction: column;
            height: auto;
            min-height: 100vh;
            overflow: visible;
          }

          .interview-left {
            width: 100vw;
            height: 40vh;
            position: relative;
          }

          .interview-right {
            width: 100vw;
            height: auto;
          }

          .right-top-row {
            flex-direction: column;
          }

          .status-card {
            width: 100%;
          }
        }
      `}</style>

      {/* LEFT: full-bleed interviewer video, no card, no padding */}
      <div className="interview-left">
        <video
          ref={videoRef}
          src={interviewerVideo}
          muted
          loop
          playsInline
          preload="auto"
          className="interviewer-video"
        />
        {/* Interviewer gender switcher — overlaid at the bottom of the video panel */}
        <div className="gender-switcher" role="group" aria-label="Select interviewer">
          <button
            type="button"
            className={`gender-btn ${interviewerGender === "male" ? "active" : ""}`}
            onClick={() => handleGenderSwitch("male")}
            aria-pressed={interviewerGender === "male"}
          >
            👨 Male
          </button>
          <button
            type="button"
            className={`gender-btn ${interviewerGender === "female" ? "active" : ""}`}
            onClick={() => handleGenderSwitch("female")}
            aria-pressed={interviewerGender === "female"}
          >
            👩 Female
          </button>
        </div>
      </div>

      {/* RIGHT: independent workspace */}
      <div className="interview-right">
        <div className="right-top-row">
          <div
            className={`interview-info ${loadingInterview ? "loading" : ""} ${interviewError ? "error" : ""}`}
          >
            {loadingInterview ? (
              <div>Loading interview...</div>
            ) : interviewError ? (
              <div>{interviewError}</div>
            ) : (
              <div>
                <h1 className="interview-role">{interview?.role || "Interview"}</h1>

                <div className="interview-meta">
                  {interview?.experience && <span>{interview.experience} Experience</span>}
                  {interview?.interviewType && <span>• {interview.interviewType}</span>}
                  {typeof interview?.numberOfQuestions === "number" && (
                    <span>• {interview.numberOfQuestions} questions</span>
                  )}
                </div>

                {interview?.difficulty && (
                  <div className="interview-difficulty">
                    <strong>Difficulty:</strong> {interview.difficulty}
                  </div>
                )}

                {interviewTopics.length > 0 && (
                  <div className="interview-topics">
                    <span className="interview-topics-label">Topics:</span>
                    {interviewTopics.map((topic) => (
                      <span key={topic} className="interview-topic-chip">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="status-card">
            <p className="status-heading">Interview Status</p>

            <div className="status-timer-row">
              <div
                className={`timer-ring ${urgency !== "normal" ? urgency : ""}`}
                style={{ "--progress": ringDegrees }}
              >
                <div className="timer-ring-inner" />
              </div>
              <span className={`timer-text ${urgency !== "normal" ? urgency : ""}`}>
                {formatTime(secondsLeft)}
              </span>
            </div>

            <p className="status-question-count">
              Question <span>{currentIndex + 1}</span> / {interviewQuestions.length}
            </p>
          </div>
        </div>

        <div className="question-card">
          <div className="question-header-row">
            <div>
              <p className="question-of">
                Question {currentIndex + 1} of {interviewQuestions.length || 0}
              </p>
              <p className="question-text">{currentQuestion?.text || "No question available."}</p>
            </div>

            {speechSupported ? (
              <button
                type="button"
                className={`read-question-btn ${isSpeaking ? "speaking" : ""}`}
                onClick={() => speakQuestion(currentQuestionText, currentQuestionSpeechKey, { force: true })}
                disabled={loadingInterview || submittingAnswer || !currentQuestionText}
              >
                {isSpeaking ? "Speaking..." : "🔊 Read Question"}
              </button>
            ) : null}
          </div>

          {!speechSupported ? (
            <p className="read-question-fallback">Read aloud is not available in this browser.</p>
          ) : null}
        </div>

        <div className="answer-input-wrap">
          <textarea
            className="answer-area"
            value={currentAnswer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="Type your answer here..."
            disabled={loadingInterview || submittingAnswer || !currentQuestion}
          />

          {speechRecognitionAvailable ? (
            <button
              type="button"
              className={`mic-button ${isListening ? "listening" : ""}`}
              onClick={handleSpeechToggle}
              aria-label={isListening ? "Stop speech recognition" : "Start speech recognition"}
              title={isListening ? "Stop microphone" : "Start microphone"}
              disabled={loadingInterview || submittingAnswer || !currentQuestion}
            >
              {isListening ? "🎙️" : "🎤"}
            </button>
          ) : null}
        </div>

        {!speechRecognitionAvailable && (
          <div className="speech-warning">
            Speech recognition is not supported in this browser. Please use Chrome or Edge.
          </div>
        )}

        <div className="feedback-card">
          <p className="feedback-text">
            {currentQuestion?.feedback || "Your answer will be evaluated after submission."}
          </p>
          <button
            className="next-question-btn"
            onClick={handleNextQuestion}
            disabled={loadingInterview || submittingAnswer || !currentQuestion}
          >
            {submittingAnswer ? "Saving..." : isLast ? "Submit" : "Next Question →"}
          </button>
        </div>
      </div>
    </div>
  );
}