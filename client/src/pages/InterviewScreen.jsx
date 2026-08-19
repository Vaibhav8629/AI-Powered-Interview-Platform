import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { getApiErrorMessage, submitAntiCheating, terminateForCheating } from "../services/api";
import { getInterviewerVideo, getInterviewerVoice } from "../services/interviewerHelpers";
import { useAntiCheating } from "../hooks/useAntiCheating";

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

  // ── Cheating termination screen — rendered before everything else ──────────
  if (cheatingTerminated) {
    return (
      <div className="termination-screen">
        <style>{`
          * { box-sizing: border-box; }
          html, body, #root { margin: 0; padding: 0; }
          .termination-screen {
            position: fixed; inset: 0;
            background: #0f172a;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            gap: 20px; padding: 32px;
            z-index: 9999; text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
          .termination-icon { font-size: 56px; line-height: 1; }
          .termination-title { font-size: 32px; font-weight: 800; color: #f1f5f9; margin: 0; letter-spacing: -0.5px; }
          .termination-subtitle { font-size: 16px; font-weight: 600; color: #ef4444; margin: 0; }
          .termination-reason {
            font-size: 14px; color: #94a3b8; max-width: 420px; line-height: 1.65;
            background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
            border-radius: 10px; padding: 14px 20px; margin: 0;
          }
          .termination-redirect { font-size: 13px; color: #475569; margin: 0; }
          .termination-home-btn {
            margin-top: 4px; background: #ef4444; color: #ffffff;
            border: none; border-radius: 10px; padding: 14px 36px;
            font-size: 15px; font-weight: 700; cursor: pointer;
            transition: opacity 0.15s ease, transform 0.15s ease;
            box-shadow: 0 4px 14px rgba(239,68,68,0.35);
          }
          .termination-home-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        `}</style>

        <p className="termination-icon">🚫</p>
        <h1 className="termination-title">Interview Ended</h1>
        <p className="termination-subtitle">Interview ended due to cheating.</p>
        <p className="termination-reason">{cheatingReason}</p>
        <p className="termination-redirect">Redirecting to Home in 5 seconds…</p>
        <button
          type="button"
          className="termination-home-btn"
          onClick={() => navigate("/")}
        >
          Return to Home
        </button>
      </div>
    );
  }

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

        /* ---------- DSA PROBLEM STATEMENT ---------- */
        .dsa-problem {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 13.5px;
          color: #1f2937;
          line-height: 1.65;
        }

        .dsa-section-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #059669;
          margin: 0 0 4px 0;
        }

        .dsa-description {
          white-space: pre-wrap;
          margin: 0;
          color: #374151;
        }

        .dsa-examples {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dsa-example-block {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 14px;
          font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace;
          font-size: 12.5px;
          white-space: pre-wrap;
          color: #1e293b;
        }

        .dsa-constraints {
          margin: 0;
          padding: 0 0 0 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dsa-constraints li {
          font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace;
          font-size: 12.5px;
          color: #334155;
        }

        .dsa-leetcode-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
          color: #0284c7;
          text-decoration: none;
          border: 1px solid #bae6fd;
          background: #f0f9ff;
          border-radius: 6px;
          padding: 5px 10px;
          width: fit-content;
          transition: background 0.15s ease;
        }

        .dsa-leetcode-link:hover {
          background: #e0f2fe;
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

        /* ---------- START SCREEN OVERLAY ---------- */
        .start-screen {
          position: absolute;
          inset: 0;
          background: rgba(247, 248, 249, 0.97);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
          padding: 32px;
          z-index: 100;
          text-align: center;
        }

        .start-screen-title {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .start-screen-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
          max-width: 360px;
          line-height: 1.6;
        }

        .start-screen-rules {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          padding: 16px 20px;
          text-align: left;
          width: 100%;
          max-width: 380px;
        }

        .start-screen-rules-title {
          font-size: 12px;
          font-weight: 700;
          color: #059669;
          margin: 0 0 10px 0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .start-screen-rules ul {
          margin: 0;
          padding: 0 0 0 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .start-screen-rules li {
          font-size: 13px;
          color: #374151;
          line-height: 1.5;
        }

        .start-interview-btn {
          background: linear-gradient(90deg, #10b981, #0d9488);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 16px 40px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.15s ease;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
        }

        .start-interview-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .start-interview-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .start-screen-error {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 13px;
          color: #b91c1c;
          max-width: 380px;
          width: 100%;
          line-height: 1.5;
        }

        /* ---------- CHEATING TERMINATION SCREEN ---------- */
        .termination-screen {
          position: fixed;
          inset: 0;
          background: #0f172a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          padding: 32px;
          z-index: 9999;
          text-align: center;
        }

        .termination-icon {
          font-size: 56px;
          line-height: 1;
        }

        .termination-title {
          font-size: 32px;
          font-weight: 800;
          color: #f1f5f9;
          margin: 0;
          letter-spacing: -0.5px;
        }

        .termination-subtitle {
          font-size: 16px;
          font-weight: 600;
          color: #ef4444;
          margin: 0;
        }

        .termination-reason {
          font-size: 14px;
          color: #94a3b8;
          max-width: 420px;
          line-height: 1.65;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 10px;
          padding: 14px 20px;
          margin: 0;
        }

        .termination-redirect {
          font-size: 13px;
          color: #475569;
          margin: 0;
        }

        .termination-home-btn {
          margin-top: 4px;
          background: #ef4444;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          padding: 14px 36px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.15s ease;
          box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
        }

        .termination-home-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        /* ---------- ANTI-CHEAT STATUS BAR ---------- */        .anti-cheat-bar {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          padding: 10px 16px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px 16px;
          font-size: 12px;
          color: #374151;
          flex-shrink: 0;
        }

        .anti-cheat-bar-title {
          font-weight: 700;
          color: #059669;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .anti-cheat-stat {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #374151;
        }

        .anti-cheat-stat.nonzero {
          color: #b45309;
          font-weight: 600;
        }

        /* ---------- FULLSCREEN BANNER ---------- */
        .fullscreen-banner {
          background: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 10px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
          color: #92400e;
          flex-shrink: 0;
        }

        .fullscreen-banner-msg {
          flex: 1;
        }

        .return-fullscreen-btn {
          flex-shrink: 0;
          background: #f59e0b;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s ease;
        }

        .return-fullscreen-btn:hover {
          opacity: 0.88;
        }

        /* ---------- WARNING SNACKBAR ---------- */
        .anti-cheat-warning {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          background: #1f2937;
          color: #f9fafb;
          border-radius: 10px;
          padding: 13px 22px;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.28);
          z-index: 9999;
          max-width: 480px;
          text-align: center;
          pointer-events: none;
          animation: snackbar-in 0.2s ease;
        }

        @keyframes snackbar-in {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
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

        {/* ── START SCREEN OVERLAY — shown until the user clicks Start Interview ── */}
        {!interviewStarted && (
          <div className="start-screen">
            <p className="start-screen-title">Ready for your interview?</p>
            <p className="start-screen-subtitle">
              {loadingInterview
                ? "Loading your interview..."
                : interview
                ? `${interview.role} · ${interview.difficulty} · ${interview.numberOfQuestions} questions`
                : ""}
            </p>

            <div className="start-screen-rules">
              <p className="start-screen-rules-title">Interview Rules</p>
              <ul>
                <li>🖥️ Fullscreen mode is required throughout</li>
                <li>👁️ Tab switching is monitored</li>
                <li>📋 Copy / Paste / Cut are restricted</li>
                <li>🖱️ Right-click is disabled</li>
              </ul>
            </div>

            {fullscreenError && (
              <div className="start-screen-error">{fullscreenError}</div>
            )}

            <button
              type="button"
              className="start-interview-btn"
              onClick={handleStartInterview}
              disabled={loadingInterview || startingInterview || Boolean(interviewError)}
            >
              {startingInterview ? "Starting..." : "Start Interview"}
            </button>
          </div>
        )}

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

        {/* ── Anti-cheating status bar ── */}
        {interviewStarted && (
          <div className="anti-cheat-bar" role="status" aria-label="Security monitoring status">
            <span className="anti-cheat-bar-title">
              🔒 Security Monitoring: Active
            </span>
            <span className={`anti-cheat-stat ${tabSwitchCount > 0 ? "nonzero" : ""}`}>
              Tab switches: {tabSwitchCount}
            </span>
            <span className={`anti-cheat-stat ${fullscreenExitCount > 0 ? "nonzero" : ""}`}>
              Fullscreen exits: {fullscreenExitCount}
            </span>
            <span className={`anti-cheat-stat ${copyAttemptCount > 0 ? "nonzero" : ""}`}>
              Copy attempts: {copyAttemptCount}
            </span>
            <span className={`anti-cheat-stat ${pasteAttemptCount > 0 ? "nonzero" : ""}`}>
              Paste attempts: {pasteAttemptCount}
            </span>
          </div>
        )}

        {/* ── Fullscreen exit banner ── */}
        {interviewStarted && !isFullscreen && !fullscreenUnavailable && (
          <div className="fullscreen-banner" role="alert">
            <span className="fullscreen-banner-msg">
              ⚠️ Please return to fullscreen mode to continue the interview.
            </span>
            <button
              type="button"
              className="return-fullscreen-btn"
              onClick={() => requestFullscreen()}
            >
              Return to Fullscreen
            </button>
          </div>
        )}

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

          {/* DSA / LeetCode full problem statement — only shown when present */}
          {currentQuestion?.description && (
            <div className="dsa-problem">
              <div>
                <p className="dsa-section-label">Problem Description</p>
                <p className="dsa-description">{currentQuestion.description}</p>
              </div>

              {currentQuestion.examples?.length > 0 && (
                <div>
                  <p className="dsa-section-label">Examples</p>
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
                  <p className="dsa-section-label">Constraints</p>
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
                  className="dsa-leetcode-link"
                >
                  🔗 View on LeetCode
                </a>
              )}
            </div>
          )}

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
            {submittingAnswer ? (isLast ? "Completing..." : "Saving...") : isLast ? "Submit Interview" : "Next Question →"}
          </button>
        </div>
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