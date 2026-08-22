import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardX,
  Eye,
  Home,
  LoaderCircle,
  Lock,
  Maximize2,
  Mic,
  Monitor,
  ShieldAlert,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import api, { getApiErrorMessage, submitAntiCheating, terminateForCheating } from "../services/api";
import { getInterviewerVideo, getInterviewerVoice } from "../services/interviewerHelpers";
import { useAntiCheating } from "../hooks/useAntiCheating";

/**
 * AI Smart Interview — Interview Studio
 * Single-file React component. Plain CSS-in-JS via a <style> tag (no Tailwind).
 * Replace the placeholder <img src="/interviewer-image.jpg" /> with your real asset.
 *
 * Layout: editorial "interview studio" — sticky header with identity/progress/timer/security,
 * a centered transcript-style question + response stage, and a slim sticky interviewer
 * sidebar (video, speaking/listening state, gender control, monitoring detail).
 * All existing state, effects, handlers, refs, and API calls are unchanged — only the
 * presentation layer (JSX structure + styles) has been redesigned.
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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function normalizeQuestion(question, index) {
  return {
    id: question?._id || index + 1,
    text: question?.question || question?.text || "",
    answer: question?.answer || "",
    questionTime: question?.questionTime || DEFAULT_QUESTION_TIME,
    feedback: question?.feedback || "",
    score: question?.score ?? null,
    // DSA / LeetCode extended fields — null for non-DSA questions
    description: question?.description || null,
    examples: Array.isArray(question?.examples) ? question.examples : [],
    constraints: Array.isArray(question?.constraints) ? question.constraints : [],
    leetcodeUrl: question?.leetcodeUrl || null,
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

  // ── Anti-cheating ──────────────────────────────────────────────────────────
  // `interviewStarted` becomes true the moment the user clicks "Start Interview".
  // Until then, no monitoring runs and no fullscreen is requested.
  const [interviewStarted, setInterviewStarted] = useState(false);

  // Cheating termination state
  const [cheatingTerminated, setCheatingTerminated] = useState(false);
  const [cheatingReason,     setCheatingReason]     = useState("");

  // navigate — used for "Return to Home" and auto-redirect
  const navigate = useNavigate();

  // Idempotency guard — ensures termination runs at most once even when
  // multiple events fire simultaneously (e.g. copy + blur at the same time).
  const cheatingTerminationRef = useRef(false);

  // Stable refs so handleCheatingTermination can call the hook's methods
  // without needing to be declared after useAntiCheating().
  const stopMonitoringRef = useRef(null);
  const getSummaryRef     = useRef(null);

  const {
    tabSwitchCount,
    fullscreenExitCount,
    copyAttemptCount,
    pasteAttemptCount,
    cutAttemptCount,
    violations,
    isFullscreen,
    fullscreenUnavailable,
    warningMessage,
    startMonitoring,
    stopMonitoring,
    requestFullscreen,
    getSummary,
  } = useAntiCheating({ onViolation: handleCheatingTermination });   // eslint-disable-line no-use-before-define

  // Keep bridge refs current so the callback always calls the latest version
  stopMonitoringRef.current = stopMonitoring;
  getSummaryRef.current     = getSummary;

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

  // ── Cheating termination handler ───────────────────────────────────────────
  // Called by useAntiCheating via onViolation when a threshold is crossed.
  // Uses bridge refs (stopMonitoringRef / getSummaryRef) so it doesn't need to
  // be declared after the hook — avoiding a circular reference issue.
  // cheatingTerminationRef ensures this runs at most ONCE even if copy + blur
  // or other simultaneous events fire together.
  function handleCheatingTermination(violationType) {
    if (cheatingTerminationRef.current) return;
    cheatingTerminationRef.current = true;

    console.log("CHEATING TERMINATION triggered —", violationType);

    // 1. Stop anti-cheating monitoring immediately
    stopMonitoringRef.current?.();

    // 2. Stop speech recognition
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend    = null;
        recognitionRef.current.onerror  = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch (_) { /* ignore */ }

    // 3. Stop TTS
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (_) { /* ignore */ }

    // 4. Pause / reset interviewer video
    try {
      if (videoRef.current) {
        videoRef.current.pause();
        if (videoRef.current.readyState > 0) {
          videoRef.current.currentTime = 0;
        }
      }
    } catch (_) { /* ignore */ }

    // 5. Stop the countdown timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // 6. Exit fullscreen
    try {
      if (document.fullscreenElement) {
        const exitFn =
          document.exitFullscreen       ||
          document.webkitExitFullscreen ||
          document.mozCancelFullScreen  ||
          document.msExitFullscreen;
        if (exitFn) exitFn.call(document);
      }
    } catch (_) { /* ignore */ }

    // 7. Map violation type to human-readable reason
    const reasonMessages = {
      TAB_SWITCH:      "Interview ended because you switched tabs/windows multiple times.",
      FULLSCREEN_EXIT: "Interview ended because fullscreen mode was exited multiple times.",
      COPY_ATTEMPT:    "Interview ended because copying content is not allowed.",
      PASTE_ATTEMPT:   "Interview ended because pasting content is not allowed.",
      CUT_ATTEMPT:     "Interview ended because cutting content is not allowed.",
    };
    const reasonText =
      reasonMessages[violationType] || "Interview ended due to a policy violation.";

    // 8. Show termination screen IMMEDIATELY — don't wait for the API
    setCheatingTerminated(true);
    setCheatingReason(reasonText);
    setSubmittingAnswer(false);

    // 9. Submit to backend asynchronously — failure must NOT un-terminate
    const summary = getSummaryRef.current?.() ?? {};
    terminateForCheating(id, { ...summary, terminationReason: violationType }).catch(
      (err) => console.warn("terminateForCheating API failed:", err?.message || err)
    );
  }

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

  // ── Start Interview ─────────────────────────────────────────────────────────
  // This is the ONLY place requestFullscreen() is called.
  // It must be triggered directly from a button click — never from useEffect
  // or a setTimeout — so the browser treats it as a user gesture.
  const [startingInterview, setStartingInterview] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");

  const handleStartInterview = useCallback(async () => {
    if (startingInterview || loadingInterview) return;
    setStartingInterview(true);
    setFullscreenError("");

    // requestFullscreen MUST be the very first await — still within the
    // synchronous user-gesture stack that the browser requires.
    const fullscreenSuccess = await requestFullscreen();

    if (!fullscreenSuccess) {
      // fullscreenUnavailable is already set inside requestFullscreen.
      // Show an in-place error and let the user try again or continue without it.
      setFullscreenError(
        "Fullscreen could not be activated. Please allow fullscreen permissions and try again."
      );
      setStartingInterview(false);
      return;
    }

    // Fullscreen granted — now start monitoring and reveal the interview.
    startMonitoring();
    setInterviewStarted(true);
    setStartingInterview(false);
  }, [startingInterview, loadingInterview, requestFullscreen, startMonitoring]);

  // ── Next question / submit ─────────────────────────────────────────────────
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
        const completionResponse = await api.post(`/api/interview/${id}/complete`);
        const feedbackResponse = await api.post(`/api/interview/${id}/feedback`);
        const finalInterviewId = completionResponse?.data?.interviewId || id;
        const generatedFeedback = feedbackResponse?.data?.feedback ?? feedbackResponse?.data ?? null;

        // Stop monitoring first so no stale events get counted
        stopMonitoring();

        // Submit anti-cheating summary — getSummary() reads refs so it's always current
        try {
          await submitAntiCheating(id, getSummary());
        } catch (acErr) {
          // Non-fatal — never block interview completion
          console.warn("Anti-cheating submit failed:", acErr?.message || acErr);
        }

        setInterview((prev) => (prev ? { ...prev, status: "completed" } : prev));
        navigate(`/feedback/${finalInterviewId}`, { state: { feedback: generatedFeedback } });
        return;
      }

      await api.post(`/api/interview/${id}/next-question`);
      setCurrentIndex((prev) => Math.min(prev + 1, interviewQuestions.length - 1));
    } catch (error) {
      setInterviewError(getApiErrorMessage(error, "Unable to submit answer."));
    } finally {
      setSubmittingAnswer(false);
    }
  }, [
    currentAnswer,
    currentQuestion,
    id,
    interviewQuestions.length,
    isLast,
    stopMonitoring,
    stopSpeechRecognition,
    submittingAnswer,
    getSummary,
  ]);

  // ── Auto-redirect after cheating termination ──────────────────────────────
  useEffect(() => {
    if (!cheatingTerminated) return;
    const timer = setTimeout(() => navigate("/"), 5_000);
    return () => clearTimeout(timer);
  }, [cheatingTerminated, navigate]);

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
  const totalQuestions = interviewQuestions.length;
  const answeredWordCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0;
  const violationTotal =
    tabSwitchCount + fullscreenExitCount + copyAttemptCount + pasteAttemptCount + cutAttemptCount;
  const aiStateLabel = isSpeaking ? "AI is speaking" : isListening ? "Listening to you" : null;

  // ── Cheating termination screen — rendered before everything else ──────────
  if (cheatingTerminated) {
    return (
      <div className="termination-screen">
        <style>{`
          * { box-sizing: border-box; }
          html, body, #root { margin: 0; padding: 0; }
          .termination-screen {
            position: fixed; inset: 0;
            background:
              radial-gradient(circle at 50% 18%, rgba(16,185,129,0.10), transparent 30rem),
              radial-gradient(circle at 50% 18%, rgba(239,68,68,0.16), transparent 26rem),
              linear-gradient(160deg, #060f0c, #0a1512 55%, #120b0b);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            gap: 18px; padding: 32px;
            z-index: 9999; text-align: center;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          .termination-icon {
            width: 68px; height: 68px; border-radius: 18px;
            display: inline-grid; place-items: center;
            color: #fecaca;
            background: rgba(239,68,68,0.12);
            border: 1px solid rgba(248,113,113,0.26);
            box-shadow: 0 24px 70px rgba(0,0,0,0.35);
          }
          .termination-title { font-size: clamp(30px, 5vw, 44px); font-weight: 800; color: #f6faf8; margin: 0; letter-spacing: -0.01em; }
          .termination-subtitle { font-size: 15px; font-weight: 700; color: #fca5a5; margin: 0; }
          .termination-reason {
            font-size: 14px; color: #cdd8d2; max-width: 460px; line-height: 1.7;
            background: rgba(15,30,25,0.7); border: 1px solid rgba(248,113,113,0.22);
            border-radius: 10px; padding: 16px 20px; margin: 0;
          }
          .termination-redirect { font-size: 13px; color: #63756d; margin: 0; }
          .termination-home-btn {
            margin-top: 4px; background: #ffffff; color: #0e1f1a;
            border: none; border-radius: 10px; padding: 14px 24px;
            display: inline-flex; align-items: center; justify-content: center; gap: 8px;
            font-size: 15px; font-weight: 800; cursor: pointer;
            transition: opacity 0.15s ease, transform 0.15s ease;
            box-shadow: 0 18px 48px rgba(0,0,0,0.28);
          }
          .termination-home-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        `}</style>

        <div className="termination-icon" aria-hidden="true"><ShieldAlert size={34} /></div>
        <h1 className="termination-title">Interview Ended</h1>
        <p className="termination-subtitle">Interview ended due to cheating.</p>
        <p className="termination-reason">{cheatingReason}</p>
        <p className="termination-redirect">Redirecting to Home in 5 seconds…</p>
        <button
          type="button"
          className="termination-home-btn"
          onClick={() => navigate("/")}
        >
          <Home size={17} aria-hidden="true" />
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="studio">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600;8..60,700&family=Inter:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; }
        html, body, #root { margin: 0; padding: 0; height: 100%; }

        .studio {
          --ink: #0e1f1a;
          --muted: #5b6d64;
          --faint: #93a49b;
          --paper: #f5f9f6;
          --panel: #ffffff;
          --line: #e0ece4;
          --line-strong: #c7dbcd;
          --moss: #0f3d2e;
          --emerald: #12855f;
          --emerald-dark: #0b6249;
          --emerald-soft: #e8f6ee;
          --mint: #eefcf4;
          --amber: #b6650a;
          --amber-soft: #fdf3e2;
          --red: #c0392b;
          --red-soft: #fbeae7;
          --shadow: 0 18px 46px rgba(13, 40, 30, 0.08);
          --shadow-lg: 0 26px 70px rgba(13, 40, 30, 0.12);
          --radius: 14px;
          --radius-sm: 10px;

          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--paper);
          color: var(--ink);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          overflow: hidden;
        }

        .studio * { font-family: inherit; }

        /* ================= HEADER ================= */
        .studio-header {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 14px 28px;
          background: var(--panel);
          border-bottom: 1px solid var(--line);
          z-index: 20;
        }

        .studio-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .studio-brand-mark {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #eafff3;
          background: linear-gradient(150deg, var(--moss), var(--emerald));
          box-shadow: 0 10px 22px rgba(15, 61, 46, 0.28);
        }

        .studio-brand-name {
          margin: 0;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.14em;
          color: var(--emerald-dark);
        }

        .studio-brand-role {
          margin: 2px 0 0;
          font-size: 14.5px;
          font-weight: 750;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 46vw;
        }

        .studio-progress {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .studio-progress-count {
          font-variant-numeric: tabular-nums;
          font-size: 15px;
          font-weight: 800;
          color: var(--ink);
          white-space: nowrap;
        }

        .studio-progress-count em {
          font-style: normal;
          font-weight: 650;
          color: var(--faint);
          margin-left: 2px;
        }

        .studio-progress-track {
          display: flex;
          gap: 4px;
        }

        .studio-progress-dot {
          width: 18px;
          height: 4px;
          border-radius: 999px;
          background: var(--line-strong);
          transition: background 0.2s ease, width 0.2s ease;
        }

        .studio-progress-dot.done { background: var(--emerald); }
        .studio-progress-dot.active { background: var(--moss); width: 26px; }

        .studio-header-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .studio-timer {
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: var(--emerald-soft);
          border: 1px solid rgba(18, 133, 95, 0.22);
          font-variant-numeric: tabular-nums;
          font-size: 13px;
          font-weight: 800;
          color: var(--emerald-dark);
        }

        .studio-timer-bar {
          position: absolute;
          left: 0; bottom: 0;
          height: 2px;
          width: calc(var(--p, 1) * 100%);
          background: var(--emerald);
          transition: width 1s linear;
        }

        .studio-timer.low { background: var(--amber-soft); border-color: rgba(182,101,10,0.28); color: var(--amber); }
        .studio-timer.low .studio-timer-bar { background: var(--amber); }
        .studio-timer.critical { background: var(--red-soft); border-color: rgba(192,57,43,0.3); color: var(--red); animation: pulse-soft 1s ease-in-out infinite; }
        .studio-timer.critical .studio-timer-bar { background: var(--red); }

        .studio-security {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 999px;
          background: #f1f5f2;
          border: 1px solid var(--line-strong);
          font-size: 12px;
          font-weight: 800;
          color: var(--muted);
        }

        .studio-security::before {
          content: "";
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--faint);
        }

        .studio-security.flagged {
          background: var(--amber-soft);
          border-color: rgba(182,101,10,0.28);
          color: var(--amber);
        }

        .studio-security.flagged::before { background: var(--amber); }

        /* ================= META STRIP ================= */
        .studio-meta-strip {
          flex-shrink: 0;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          padding: 10px 28px;
          background: var(--mint);
          border-bottom: 1px solid var(--line);
          font-size: 12.5px;
          font-weight: 700;
          color: var(--muted);
        }

        .studio-meta-strip.loading,
        .studio-meta-strip.error {
          color: var(--muted);
        }

        .studio-meta-strip.error {
          background: var(--red-soft);
          color: var(--red);
          border-color: rgba(192,57,43,0.2);
        }

        .meta-chip {
          display: inline-flex;
          align-items: center;
          padding: 5px 11px;
          border-radius: 999px;
          background: var(--panel);
          border: 1px solid var(--line-strong);
          color: var(--moss);
        }

        .meta-chip.accent {
          background: var(--emerald-soft);
          border-color: rgba(18,133,95,0.24);
          color: var(--emerald-dark);
        }

        /* ================= FULLSCREEN BANNER ================= */
        .fullscreen-banner {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 28px;
          background: var(--amber-soft);
          border-bottom: 1px solid rgba(182,101,10,0.24);
          font-size: 13px;
          font-weight: 700;
          color: var(--amber);
        }

        .fullscreen-banner-msg {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .return-fullscreen-btn {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--amber);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }

        .return-fullscreen-btn:hover { opacity: 0.88; }

        /* ================= MAIN ================= */
        .studio-main {
          position: relative;
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
        }

        /* ---- STAGE ---- */
        .studio-stage {
          min-width: 0;
          overflow-y: auto;
          padding: 40px 32px 120px;
        }

        .studio-stage::-webkit-scrollbar { width: 10px; }
        .studio-stage::-webkit-scrollbar-track { background: transparent; }
        .studio-stage::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 999px; border: 3px solid var(--paper); }

        .stage-inner {
          max-width: 760px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .question-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .question-index {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--emerald-dark);
        }

        .question-top-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ai-state-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 750;
          color: var(--emerald-dark);
        }

        .ai-state-pill::before {
          content: "";
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--emerald);
          animation: pulse-soft 1.3s ease-in-out infinite;
        }

        .read-toggle {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid var(--line-strong);
          background: var(--panel);
          color: var(--moss);
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 12.5px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.16s ease;
        }

        .read-toggle:hover:not(:disabled) {
          border-color: var(--emerald);
          color: var(--emerald-dark);
        }

        .read-toggle:disabled { opacity: 0.5; cursor: not-allowed; }

        .read-toggle.active {
          background: var(--moss);
          border-color: var(--moss);
          color: #eafff3;
        }

        .question-heading {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.4;
          font-weight: 650;
          color: var(--ink);
          margin: 0;
          letter-spacing: -0.01em;
        }

        .hint-text {
          margin: 0;
          font-size: 12.5px;
          color: var(--faint);
        }

        .hint-text.warning {
          color: var(--amber);
        }

        /* ---- DSA BLOCK ---- */
        .dsa-block {
          margin-top: 6px;
          padding-top: 22px;
          border-top: 1px solid var(--line);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .dsa-row-label {
          margin: 0 0 6px;
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--emerald-dark);
        }

        .dsa-text {
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
          color: #33443c;
          white-space: pre-wrap;
        }

        .dsa-examples {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dsa-example-block {
          background: #0f1f1a;
          color: #d6f5e6;
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace;
          font-size: 12.5px;
          white-space: pre-wrap;
          line-height: 1.6;
        }

        .dsa-constraints {
          margin: 0;
          padding: 0 0 0 18px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .dsa-constraints li {
          font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace;
          font-size: 12.5px;
          color: #3f5148;
        }

        .dsa-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          font-size: 12.5px;
          font-weight: 750;
          color: var(--emerald-dark);
          text-decoration: none;
          border: 1px solid rgba(18,133,95,0.28);
          background: var(--emerald-soft);
          border-radius: var(--radius-sm);
          padding: 8px 13px;
          transition: background 0.15s ease;
        }

        .dsa-link:hover { background: #d9f2e5; }

        /* ---- ANSWER BLOCK ---- */
        .answer-block {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .answer-block-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }

        .answer-label {
          margin: 0;
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
        }

        .answer-count {
          font-size: 12px;
          font-weight: 650;
          color: var(--faint);
          font-variant-numeric: tabular-nums;
        }

        .answer-shell {
          position: relative;
          border-radius: var(--radius);
          background: var(--panel);
          border: 1px solid var(--line-strong);
          box-shadow: var(--shadow);
          transition: border-color 0.16s ease, box-shadow 0.16s ease;
        }

        .answer-shell:focus-within {
          border-color: var(--emerald);
          box-shadow: 0 0 0 4px rgba(18,133,95,0.13), var(--shadow);
        }

        .answer-area {
          width: 100%;
          min-height: 220px;
          resize: vertical;
          border: none;
          background: transparent;
          border-radius: var(--radius);
          padding: 20px 60px 20px 20px;
          font-size: 15px;
          line-height: 1.75;
          color: var(--ink);
          font-family: inherit;
        }

        .answer-area:focus { outline: none; }
        .answer-area::placeholder { color: var(--faint); }

        .mic-button {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: 1px solid rgba(18,133,95,0.24);
          background: var(--emerald-soft);
          color: var(--emerald-dark);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .mic-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(18,133,95,0.18);
        }

        .mic-button.listening {
          background: var(--red-soft);
          border-color: rgba(192,57,43,0.3);
          color: var(--red);
          box-shadow: 0 0 0 4px rgba(192,57,43,0.12);
          animation: pulse-soft 1.2s ease-in-out infinite;
        }

        .mic-button:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ---- STAGE FOOTER (sticky CTA) ---- */
        .stage-footer-anchor {
          position: sticky;
          bottom: 0;
          margin-top: 8px;
          padding-top: 18px;
          background: linear-gradient(180deg, rgba(245,249,246,0), var(--paper) 30%);
        }

        .stage-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 18px;
          border-radius: var(--radius);
          background: var(--panel);
          border: 1px solid var(--line);
          box-shadow: var(--shadow-lg);
        }

        .stage-feedback {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--muted);
          line-height: 1.5;
        }

        .continue-btn {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: none;
          border-radius: var(--radius-sm);
          padding: 13px 22px;
          background: linear-gradient(135deg, var(--moss), var(--emerald));
          color: #ffffff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 16px 34px rgba(15,61,46,0.24);
          transition: opacity 0.15s ease, transform 0.15s ease;
        }

        .continue-btn:hover:not(:disabled) { opacity: 0.94; transform: translateY(-1px); }
        .continue-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ---- SIDE (interviewer sidebar) ---- */
        .studio-side {
          border-left: 1px solid var(--line);
          background: var(--panel);
          padding: 22px 18px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .interviewer-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .interviewer-frame {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 5;
          border-radius: var(--radius);
          overflow: hidden;
          background: #0c1a15;
          border: 1px solid var(--line-strong);
          box-shadow: var(--shadow);
        }

        .interviewer-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .interviewer-frame.speaking {
          box-shadow: 0 0 0 3px rgba(18,133,95,0.35), var(--shadow);
        }

        .interviewer-frame.listening {
          box-shadow: 0 0 0 3px rgba(192,57,43,0.3), var(--shadow);
        }

        .interviewer-indicator {
          position: absolute;
          top: 12px;
          left: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 999px;
          background: rgba(8, 20, 16, 0.55);
          backdrop-filter: blur(6px);
          font-size: 10.5px;
          font-weight: 750;
          color: #eafff3;
        }

        .interviewer-indicator::before {
          content: "";
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #8fa39a;
        }

        .interviewer-indicator.speaking::before { background: #34d399; animation: pulse-soft 1.1s ease-in-out infinite; }
        .interviewer-indicator.listening::before { background: #f87171; animation: pulse-soft 1.1s ease-in-out infinite; }

        .interviewer-meta { text-align: center; }

        .interviewer-name {
          margin: 0;
          font-size: 13px;
          font-weight: 800;
          color: var(--ink);
        }

        .interviewer-state {
          margin: 2px 0 0;
          font-size: 12px;
          font-weight: 650;
          color: var(--faint);
        }

        .gender-switcher {
          display: flex;
          background: var(--paper);
          border: 1px solid var(--line-strong);
          border-radius: 999px;
          padding: 3px;
          gap: 3px;
        }

        .gender-btn {
          flex: 1;
          border: none;
          border-radius: 999px;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition: background 0.16s ease, color 0.16s ease;
          background: transparent;
          color: var(--muted);
        }

        .gender-btn.active {
          background: var(--moss);
          color: #eafff3;
        }

        .gender-btn:not(.active):hover { color: var(--ink); }

        .side-divider {
          height: 1px;
          background: var(--line);
          border: none;
          margin: 0;
        }

        .security-card {
          border-radius: var(--radius-sm);
          border: 1px solid var(--line);
          background: var(--paper);
          padding: 14px;
        }

        .security-card-title {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0 0 10px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--emerald-dark);
        }

        .security-card ul {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .security-card li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12.5px;
          font-weight: 650;
          color: var(--muted);
        }

        .security-card li strong {
          font-variant-numeric: tabular-nums;
          color: var(--ink);
        }

        .security-card li.flagged strong { color: var(--amber); }

        /* ================= LOBBY ================= */
        .studio-lobby {
          position: absolute;
          inset: 0;
          background: rgba(245, 249, 246, 0.97);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          z-index: 50;
          overflow-y: auto;
        }

        .lobby-card {
          width: 100%;
          max-width: 460px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          text-align: center;
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 36px 32px;
          box-shadow: var(--shadow-lg);
        }

        .lobby-mark {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #eafff3;
          background: linear-gradient(150deg, var(--moss), var(--emerald));
          box-shadow: 0 16px 34px rgba(15,61,46,0.26);
        }

        .lobby-title {
          margin: 0;
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: clamp(24px, 3.4vw, 30px);
          font-weight: 650;
          color: var(--ink);
        }

        .lobby-sub {
          margin: 0;
          font-size: 13.5px;
          color: var(--muted);
          font-weight: 600;
          line-height: 1.6;
        }

        .lobby-grid {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .lobby-stat {
          border-radius: var(--radius-sm);
          border: 1px solid var(--line);
          background: var(--paper);
          padding: 12px;
          text-align: left;
        }

        .lobby-stat span {
          display: block;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--faint);
          margin-bottom: 3px;
        }

        .lobby-stat strong {
          font-size: 13.5px;
          font-weight: 750;
          color: var(--ink);
        }

        .lobby-checklist {
          width: 100%;
          text-align: left;
          border-radius: var(--radius-sm);
          border: 1px solid var(--line);
          background: var(--mint);
          padding: 16px 18px;
        }

        .lobby-checklist-title {
          margin: 0 0 10px;
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--emerald-dark);
        }

        .lobby-checklist ul {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .lobby-checklist li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12.5px;
          font-weight: 650;
          color: #33443c;
        }

        .lobby-checklist li svg { color: var(--emerald-dark); flex-shrink: 0; }

        .lobby-error {
          width: 100%;
          border-radius: var(--radius-sm);
          background: var(--red-soft);
          border: 1px solid rgba(192,57,43,0.28);
          color: var(--red);
          font-size: 12.5px;
          font-weight: 650;
          padding: 12px 14px;
          line-height: 1.5;
        }

        .lobby-start-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: none;
          border-radius: var(--radius-sm);
          padding: 15px 0;
          background: linear-gradient(135deg, var(--moss), var(--emerald));
          color: #ffffff;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 18px 40px rgba(15,61,46,0.28);
          transition: opacity 0.15s ease, transform 0.15s ease;
        }

        .lobby-start-btn:hover:not(:disabled) { opacity: 0.94; transform: translateY(-1px); }
        .lobby-start-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .lobby-start-btn .spin { animation: room-spin 0.9s linear infinite; }

        /* ================= WARNING SNACKBAR ================= */
        .anti-cheat-warning {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          background: #0e1f1a;
          color: #eafff3;
          border-radius: var(--radius-sm);
          padding: 13px 22px;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 22px 54px rgba(15,23,42,0.28);
          z-index: 9999;
          max-width: 480px;
          text-align: center;
          pointer-events: none;
          animation: snackbar-in 0.2s ease;
        }

        @keyframes pulse-soft {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.82); }
        }

        @keyframes room-spin {
          to { transform: rotate(360deg); }
        }

        @keyframes snackbar-in {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* ================= RESPONSIVE ================= */
        @media (max-width: 1180px) {
          .studio-main { grid-template-columns: minmax(0, 1fr) 260px; }
          .studio-brand-role { max-width: 30vw; }
        }

        @media (max-width: 940px) {
          .studio-main {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
            overflow-y: auto;
          }

          .studio-side {
            border-left: none;
            border-bottom: 1px solid var(--line);
            flex-direction: row;
            align-items: center;
            padding: 14px 20px;
            gap: 14px;
            overflow-x: auto;
          }

          .interviewer-card {
            flex-direction: row;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
          }

          .interviewer-frame { width: 64px; height: 80px; aspect-ratio: auto; flex-shrink: 0; }
          .interviewer-meta { text-align: left; }
          .gender-switcher { width: 160px; }
          .side-divider { display: none; }
          .security-card { flex-shrink: 0; min-width: 220px; }

          .studio-progress-count { display: none; }
        }

        @media (max-width: 640px) {
          .studio-header { padding: 12px 16px; flex-wrap: wrap; row-gap: 8px; }
          .studio-brand-role { max-width: 48vw; }
          .studio-progress { order: 3; width: 100%; justify-content: center; }
          .studio-meta-strip, .fullscreen-banner { padding: 10px 16px; }
          .studio-stage { padding: 24px 16px 110px; }
          .stage-footer { flex-direction: column; align-items: stretch; text-align: center; }
          .continue-btn { justify-content: center; }
          .lobby-grid { grid-template-columns: 1fr; }
          .studio-side { padding: 12px 16px; }
        }
      `}</style>

      {/* ================= HEADER ================= */}
      <header className="studio-header">
        <div className="studio-brand">
          <span className="studio-brand-mark" aria-hidden="true">
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="studio-brand-name">AI INTERVIEW</p>
            <p className="studio-brand-role">{interview?.role || (loadingInterview ? "Preparing…" : "Interview")}</p>
          </div>
        </div>

        {totalQuestions > 0 && (
          <div className="studio-progress" aria-label="Interview progress">
            <span className="studio-progress-count">
              {pad2(currentIndex + 1)}<em>/ {pad2(totalQuestions)}</em>
            </span>
            <div className="studio-progress-track">
              {interviewQuestions.map((q, i) => (
                <span
                  key={q.id}
                  className={`studio-progress-dot ${i < currentIndex ? "done" : ""} ${i === currentIndex ? "active" : ""}`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="studio-header-right">
          <div className={`studio-timer ${urgency !== "normal" ? urgency : ""}`}>
            <span className="studio-timer-bar" style={{ "--p": progressRatio }} />
            {formatTime(secondsLeft)}
          </div>
          <div className={`studio-security ${violationTotal > 0 ? "flagged" : ""}`}>
            <Lock size={12} aria-hidden="true" />
            {!interviewStarted ? "Standby" : violationTotal > 0 ? `${violationTotal} flagged` : "Secure"}
          </div>
        </div>
      </header>

      {/* ================= META STRIP ================= */}
      {loadingInterview ? (
        <div className="studio-meta-strip loading">Preparing your interview workspace…</div>
      ) : interviewError ? (
        <div className="studio-meta-strip error">{interviewError}</div>
      ) : interview ? (
        <div className="studio-meta-strip">
          {interview.experience && <span className="meta-chip">{interview.experience} experience</span>}
          {interview.interviewType && <span className="meta-chip">{interview.interviewType}</span>}
          {interview.difficulty && <span className="meta-chip accent">{interview.difficulty}</span>}
          {interviewTopics.map((topic) => (
            <span key={topic} className="meta-chip">{topic}</span>
          ))}
        </div>
      ) : null}

      {/* ================= FULLSCREEN BANNER ================= */}
      {interviewStarted && !isFullscreen && !fullscreenUnavailable && (
        <div className="fullscreen-banner" role="alert">
          <span className="fullscreen-banner-msg">
            <AlertTriangle size={15} aria-hidden="true" />
            Please return to fullscreen mode to continue the interview.
          </span>
          <button type="button" className="return-fullscreen-btn" onClick={() => requestFullscreen()}>
            <Maximize2 size={13} aria-hidden="true" />
            Return to Fullscreen
          </button>
        </div>
      )}

      {/* ================= MAIN ================= */}
      <div className="studio-main">
        <main className="studio-stage">
          <div className="stage-inner">
            <section>
              <div className="question-top">
                <span className="question-index">
                  Question {pad2(currentIndex + 1)} of {pad2(totalQuestions || 0)}
                </span>
                <div className="question-top-right">
                  {aiStateLabel && <span className="ai-state-pill">{aiStateLabel}</span>}
                  {speechSupported && (
                    <button
                      type="button"
                      className={`read-toggle ${isSpeaking ? "active" : ""}`}
                      onClick={() => speakQuestion(currentQuestionText, currentQuestionSpeechKey, { force: true })}
                      disabled={loadingInterview || submittingAnswer || !currentQuestionText}
                    >
                      <Volume2 size={14} aria-hidden="true" />
                      {isSpeaking ? "Speaking…" : "Read aloud"}
                    </button>
                  )}
                </div>
              </div>

              <h1 className="question-heading">
                {currentQuestion?.text || "No question available."}
              </h1>

              {!speechSupported && (
                <p className="hint-text" style={{ marginTop: 10 }}>Read aloud isn't available in this browser.</p>
              )}

              {/* DSA / LeetCode full problem statement — only shown when present */}
              {currentQuestion?.description && (
                <div className="dsa-block">
                  <div>
                    <p className="dsa-row-label">Problem description</p>
                    <p className="dsa-text">{currentQuestion.description}</p>
                  </div>

                  {currentQuestion.examples?.length > 0 && (
                    <div>
                      <p className="dsa-row-label">Examples</p>
                      <div className="dsa-examples">
                        {currentQuestion.examples.map((ex, i) => (
                          <div key={i} className="dsa-example-block">
                            {ex.exampleText || `Example ${ex.exampleNum ?? i + 1}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentQuestion.constraints?.length > 0 && (
                    <div>
                      <p className="dsa-row-label">Constraints</p>
                      <ul className="dsa-constraints">
                        {currentQuestion.constraints.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {currentQuestion.leetcodeUrl && (
                    <a
                      href={currentQuestion.leetcodeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dsa-link"
                    >
                      View on LeetCode
                      <ArrowRight size={13} aria-hidden="true" />
                    </a>
                  )}
                </div>
              )}
            </section>

            <section className="answer-block">
              <div className="answer-block-header">
                <p className="answer-label">Your response</p>
                <span className="answer-count">{answeredWordCount} words</span>
              </div>

              <div className="answer-shell">
                <textarea
                  className="answer-area"
                  value={currentAnswer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Type your answer here…"
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
                    <Mic size={17} aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              {!speechRecognitionAvailable && (
                <p className="hint-text warning">
                  Speech recognition is not supported in this browser. Please use Chrome or Edge.
                </p>
              )}
            </section>

            <div className="stage-footer-anchor">
              <div className="stage-footer">
                <p className="stage-feedback">
                  {currentQuestion?.feedback || "Your answer will be evaluated after submission."}
                </p>
                <button
                  type="button"
                  className="continue-btn"
                  onClick={handleNextQuestion}
                  disabled={loadingInterview || submittingAnswer || !currentQuestion}
                >
                  {submittingAnswer ? (
                    isLast ? "Completing…" : "Saving…"
                  ) : isLast ? (
                    "Submit Interview"
                  ) : (
                    <>
                      Continue
                      <ArrowRight size={16} aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* ================= SIDE: interviewer + security ================= */}
        <aside className="studio-side">
          <div className="interviewer-card">
            <div className={`interviewer-frame ${isSpeaking ? "speaking" : isListening ? "listening" : ""}`}>
              <video
                ref={videoRef}
                src={interviewerVideo}
                muted
                loop
                playsInline
                preload="auto"
                className="interviewer-video"
              />
              <span className={`interviewer-indicator ${isSpeaking ? "speaking" : isListening ? "listening" : ""}`}>
                {isSpeaking ? "Speaking" : isListening ? "Listening" : "Standing by"}
              </span>
            </div>

            <div className="interviewer-meta">
              <p className="interviewer-name">AI Interviewer</p>
              <p className="interviewer-state">
                {isSpeaking ? "Reading the question aloud" : isListening ? "Listening to your answer" : "Ready when you are"}
              </p>
            </div>

            <div className="gender-switcher" role="group" aria-label="Select interviewer">
              <button
                type="button"
                className={`gender-btn ${interviewerGender === "male" ? "active" : ""}`}
                onClick={() => handleGenderSwitch("male")}
                aria-pressed={interviewerGender === "male"}
              >
                Male
              </button>
              <button
                type="button"
                className={`gender-btn ${interviewerGender === "female" ? "active" : ""}`}
                onClick={() => handleGenderSwitch("female")}
                aria-pressed={interviewerGender === "female"}
              >
                Female
              </button>
            </div>
          </div>

          {interviewStarted && (
            <>
              <hr className="side-divider" />
              <div className="security-card">
                <p className="security-card-title">
                  <ShieldCheck size={13} aria-hidden="true" />
                  Monitoring
                </p>
                <ul>
                  <li className={tabSwitchCount > 0 ? "flagged" : ""}>
                    Tab switches <strong>{tabSwitchCount}</strong>
                  </li>
                  <li className={fullscreenExitCount > 0 ? "flagged" : ""}>
                    Fullscreen exits <strong>{fullscreenExitCount}</strong>
                  </li>
                  <li className={copyAttemptCount > 0 ? "flagged" : ""}>
                    Copy attempts <strong>{copyAttemptCount}</strong>
                  </li>
                  <li className={pasteAttemptCount > 0 ? "flagged" : ""}>
                    Paste attempts <strong>{pasteAttemptCount}</strong>
                  </li>
                  <li className={cutAttemptCount > 0 ? "flagged" : ""}>
                    Cut attempts <strong>{cutAttemptCount}</strong>
                  </li>
                </ul>
              </div>
            </>
          )}
        </aside>

        {/* ================= LOBBY (pre-interview overlay) ================= */}
        {!interviewStarted && (
          <div className="studio-lobby">
            <div className="lobby-card">
              <span className="lobby-mark" aria-hidden="true">
                <ShieldCheck size={24} />
              </span>

              <h1 className="lobby-title">Your interview is ready</h1>
              <p className="lobby-sub">
                {loadingInterview
                  ? "Loading your interview…"
                  : interview
                  ? "Take a moment to review the details below, then start whenever you're ready."
                  : interviewError || "Interview details are unavailable."}
              </p>

              {interview && !loadingInterview && (
                <div className="lobby-grid">
                  <div className="lobby-stat">
                    <span>Role</span>
                    <strong>{interview.role || "—"}</strong>
                  </div>
                  <div className="lobby-stat">
                    <span>Difficulty</span>
                    <strong>{interview.difficulty || "—"}</strong>
                  </div>
                  <div className="lobby-stat">
                    <span>Questions</span>
                    <strong>{interview.numberOfQuestions ?? totalQuestions ?? "—"}</strong>
                  </div>
                  <div className="lobby-stat">
                    <span>Est. duration</span>
                    <strong>{interview.duration ? `${interview.duration} min` : "—"}</strong>
                  </div>
                </div>
              )}

              <div className="lobby-checklist">
                <p className="lobby-checklist-title">Before you begin</p>
                <ul>
                  <li><Maximize2 size={15} aria-hidden="true" /> Fullscreen mode is required for the full session</li>
                  <li><Eye size={15} aria-hidden="true" /> Tab switching is tracked</li>
                  <li><ClipboardX size={15} aria-hidden="true" /> Copy, paste and cut are restricted</li>
                  <li><Monitor size={15} aria-hidden="true" /> Right-click is disabled</li>
                </ul>
              </div>

              {fullscreenError && <div className="lobby-error">{fullscreenError}</div>}

              <button
                type="button"
                className="lobby-start-btn"
                onClick={handleStartInterview}
                disabled={loadingInterview || startingInterview || Boolean(interviewError)}
              >
                {startingInterview ? (
                  <>
                    <LoaderCircle size={18} className="spin" aria-hidden="true" />
                    Starting…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} aria-hidden="true" />
                    Start Interview
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Warning snackbar (tab switch, clipboard, fullscreen) ── */}
      {warningMessage && (
        <div className="anti-cheat-warning" role="alert" aria-live="assertive">
          {warningMessage}
        </div>
      )}
    </div>
  );
}