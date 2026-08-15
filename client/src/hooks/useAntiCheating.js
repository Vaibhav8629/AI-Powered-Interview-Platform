import { useState, useRef, useCallback, useEffect } from "react";

/**
 * useAntiCheating — Centralized anti-cheating hook.
 *
 * KEY DESIGN DECISIONS:
 *
 * 1. All event handlers are stored in stable refs. addEventListener /
 *    removeEventListener require the EXACT SAME function reference.
 *    useCallback with deps creates NEW references on each render, making
 *    removeEventListener a no-op. We solve this with stable dispatcher refs.
 *
 * 2. Tab switch uses ONLY visibilitychange. window.blur fires for DevTools,
 *    dialogs, OS notifications etc. causing false positives.
 *
 * 3. All counts are tracked in BOTH refs (synchronous, always-current) and
 *    state (for UI). getSummary() reads refs only — never stale.
 *
 * 4. Termination thresholds:
 *    - TAB_SWITCH     : terminate at count >= 2  (1st = warning, 2nd = terminate)
 *    - FULLSCREEN_EXIT: terminate at count >= 2  (1st = warning, 2nd = terminate)
 *    - COPY_ATTEMPT   : terminate at count >= 1  (immediate)
 *    - PASTE_ATTEMPT  : terminate at count >= 1  (immediate)
 *    - CUT_ATTEMPT    : terminate at count >= 1  (immediate)
 *
 * 5. onViolation(type, count) — optional callback called after every
 *    threshold-crossing event. InterviewScreen wires this to its own
 *    cheating-termination handler. The hook itself does not navigate,
 *    stop speech, or touch the video — those concerns stay in the screen.
 *
 * @param {{ onViolation?: (type: string, count: number) => void }} [options]
 */
export function useAntiCheating({ onViolation } = {}) {
  // ── React state (for UI rendering) ────────────────────────────────────────
  const [tabSwitchCount,      setTabSwitchCount]      = useState(0);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [copyAttemptCount,    setCopyAttemptCount]    = useState(0);
  const [pasteAttemptCount,   setPasteAttemptCount]   = useState(0);
  const [cutAttemptCount,     setCutAttemptCount]     = useState(0);
  const [violations,          setViolations]          = useState([]);
  const [isFullscreen,        setIsFullscreen]        = useState(false);
  const [fullscreenUnavailable, setFullscreenUnavailable] = useState(false);
  const [warningMessage,      setWarningMessage]      = useState("");

  // ── Ref mirrors (getSummary() reads these — always current) ───────────────
  const tabSwitchCountRef      = useRef(0);
  const fullscreenExitCountRef = useRef(0);
  const copyAttemptCountRef    = useRef(0);
  const pasteAttemptCountRef   = useRef(0);
  const cutAttemptCountRef     = useRef(0);
  const violationsRef          = useRef([]);

  // ── Control refs ───────────────────────────────────────────────────────────
  const isActiveRef          = useRef(false);  // true while interview is running
  const monitoringRef        = useRef(false);  // idempotency guard
  const lastTabSwitchTimeRef = useRef(0);      // debounce timestamp
  const fullscreenEnteredRef = useRef(false);  // true after first fullscreen grant
  const warningTimerRef      = useRef(null);

  // Keep the latest onViolation callback reachable from stable handler refs
  const onViolationRef = useRef(onViolation);
  useEffect(() => { onViolationRef.current = onViolation; }, [onViolation]);

  // ── Stable inner-logic refs populated once on mount ───────────────────────
  const onVisibilityChangeRef  = useRef(null);
  const onFullscreenChangeRef  = useRef(null);
  const onCopyRef              = useRef(null);
  const onPasteRef             = useRef(null);
  const onCutRef               = useRef(null);
  const onContextMenuRef       = useRef(null);

  // ── Warning helper ─────────────────────────────────────────────────────────
  const showWarning = useCallback((message) => {
    setWarningMessage(message);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => setWarningMessage(""), 5_000);
  }, []);

  // Keep showWarning reachable from stable handler refs
  const showWarningRef = useRef(showWarning);
  useEffect(() => { showWarningRef.current = showWarning; }, [showWarning]);

  // ── Build stable handler logic (runs once on mount, empty deps) ───────────
  useEffect(() => {

    // ── TAB SWITCH ────────────────────────────────────────────────────────────
    onVisibilityChangeRef.current = () => {
      console.log(
        "Visibility changed:", document.visibilityState,
        "| active:", isActiveRef.current
      );
      if (!isActiveRef.current) return;
      if (document.visibilityState !== "hidden") return;

      const now = Date.now();
      if (now - lastTabSwitchTimeRef.current < 1_000) {
        console.log("Tab switch debounced — too soon");
        return;
      }
      lastTabSwitchTimeRef.current = now;

      tabSwitchCountRef.current += 1;
      const count = tabSwitchCountRef.current;

      const entry = { type: "TAB_SWITCH", timestamp: new Date().toISOString() };
      violationsRef.current = [...violationsRef.current, entry];

      setTabSwitchCount(count);
      setViolations([...violationsRef.current]);
      console.log("TAB SWITCH DETECTED — count:", count);

      if (count >= 2) {
        // Second switch → terminate
        onViolationRef.current?.("TAB_SWITCH", count);
      } else {
        // First switch → warn only
        showWarningRef.current(
          `Warning ${count}: Leaving the interview window is not allowed.`
        );
      }
    };

    // ── FULLSCREEN EXIT ───────────────────────────────────────────────────────
    onFullscreenChangeRef.current = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      console.log("Fullscreen changed:", isNowFullscreen);
      setIsFullscreen(isNowFullscreen);

      if (isNowFullscreen) {
        // Entry event — never count as an exit
        fullscreenEnteredRef.current = true;
        return;
      }

      // Exit — only counts while interview is active and we were inside fullscreen
      if (fullscreenEnteredRef.current && isActiveRef.current) {
        fullscreenEnteredRef.current = false;

        fullscreenExitCountRef.current += 1;
        const count = fullscreenExitCountRef.current;

        const entry = { type: "FULLSCREEN_EXIT", timestamp: new Date().toISOString() };
        violationsRef.current = [...violationsRef.current, entry];

        setFullscreenExitCount(count);
        setViolations([...violationsRef.current]);
        console.log("FULLSCREEN EXIT DETECTED — count:", count);

        if (count >= 2) {
          onViolationRef.current?.("FULLSCREEN_EXIT", count);
        } else {
          showWarningRef.current(
            "Please return to fullscreen mode to continue the interview."
          );
        }
      }
    };

    // ── COPY — terminate immediately ─────────────────────────────────────────
    onCopyRef.current = (e) => {
      if (!isActiveRef.current) return;
      e.preventDefault();

      copyAttemptCountRef.current += 1;
      const count = copyAttemptCountRef.current;
      const entry = { type: "COPY_ATTEMPT", timestamp: new Date().toISOString() };
      violationsRef.current = [...violationsRef.current, entry];

      setCopyAttemptCount(count);
      setViolations([...violationsRef.current]);

      onViolationRef.current?.("COPY_ATTEMPT", count);
    };

    // ── PASTE — terminate immediately ────────────────────────────────────────
    onPasteRef.current = (e) => {
      if (!isActiveRef.current) return;
      e.preventDefault();

      pasteAttemptCountRef.current += 1;
      const count = pasteAttemptCountRef.current;
      const entry = { type: "PASTE_ATTEMPT", timestamp: new Date().toISOString() };
      violationsRef.current = [...violationsRef.current, entry];

      setPasteAttemptCount(count);
      setViolations([...violationsRef.current]);

      onViolationRef.current?.("PASTE_ATTEMPT", count);
    };

    // ── CUT — terminate immediately ──────────────────────────────────────────
    onCutRef.current = (e) => {
      if (!isActiveRef.current) return;
      e.preventDefault();

      cutAttemptCountRef.current += 1;
      const count = cutAttemptCountRef.current;
      const entry = { type: "CUT_ATTEMPT", timestamp: new Date().toISOString() };
      violationsRef.current = [...violationsRef.current, entry];

      setCutAttemptCount(count);
      setViolations([...violationsRef.current]);

      onViolationRef.current?.("CUT_ATTEMPT", count);
    };

    // ── CONTEXT MENU — silently prevent ──────────────────────────────────────
    onContextMenuRef.current = (e) => {
      if (!isActiveRef.current) return;
      e.preventDefault();
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — stable handlers built exactly once

  // ── Stable dispatcher wrappers (registered with addEventListener once) ────
  // Delegate to the *Ref.current functions above so there is no stale closure.
  const stableVisibilityHandler  = useRef((e) => onVisibilityChangeRef.current?.(e));
  const stableFullscreenHandler  = useRef((e) => onFullscreenChangeRef.current?.(e));
  const stableCopyHandler        = useRef((e) => onCopyRef.current?.(e));
  const stablePasteHandler       = useRef((e) => onPasteRef.current?.(e));
  const stableCutHandler         = useRef((e) => onCutRef.current?.(e));
  const stableContextMenuHandler = useRef((e) => onContextMenuRef.current?.(e));

  // ── Fullscreen request ─────────────────────────────────────────────────────
  // MUST be called directly from a user-gesture click handler.
  const requestFullscreen = useCallback(async () => {
    const target = document.documentElement;
    const requestFn =
      target.requestFullscreen       ||
      target.webkitRequestFullscreen ||
      target.mozRequestFullScreen    ||
      target.msRequestFullscreen;

    if (!requestFn) {
      console.warn("Fullscreen API not available in this browser");
      setFullscreenUnavailable(true);
      showWarning("Fullscreen is not supported by your browser.");
      return false;
    }

    console.log("Requesting fullscreen...");
    try {
      await requestFn.call(target);
      console.log("Fullscreen request succeeded");
      return true;
    } catch (error) {
      console.error("Fullscreen request failed:", error);
      setFullscreenUnavailable(true);
      showWarning(
        "Fullscreen could not be activated. Please allow fullscreen and try again."
      );
      return false;
    }
  }, [showWarning]);

  // ── Monitoring lifecycle ───────────────────────────────────────────────────

  const startMonitoring = useCallback(() => {
    if (monitoringRef.current) {
      console.log("Anti-cheating monitoring already active — skipping duplicate start");
      return;
    }
    monitoringRef.current = true;
    isActiveRef.current   = true;

    document.addEventListener("visibilitychange",       stableVisibilityHandler.current);
    document.addEventListener("fullscreenchange",       stableFullscreenHandler.current);
    document.addEventListener("webkitfullscreenchange", stableFullscreenHandler.current);
    document.addEventListener("mozfullscreenchange",    stableFullscreenHandler.current);
    document.addEventListener("msfullscreenchange",     stableFullscreenHandler.current);
    document.addEventListener("copy",                   stableCopyHandler.current);
    document.addEventListener("paste",                  stablePasteHandler.current);
    document.addEventListener("cut",                    stableCutHandler.current);
    document.addEventListener("contextmenu",            stableContextMenuHandler.current);

    console.log("Anti-cheating monitoring started");
  }, []); // no deps — reads only stable refs

  const stopMonitoring = useCallback(() => {
    isActiveRef.current   = false;
    monitoringRef.current = false;

    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }

    document.removeEventListener("visibilitychange",       stableVisibilityHandler.current);
    document.removeEventListener("fullscreenchange",       stableFullscreenHandler.current);
    document.removeEventListener("webkitfullscreenchange", stableFullscreenHandler.current);
    document.removeEventListener("mozfullscreenchange",    stableFullscreenHandler.current);
    document.removeEventListener("msfullscreenchange",     stableFullscreenHandler.current);
    document.removeEventListener("copy",                   stableCopyHandler.current);
    document.removeEventListener("paste",                  stablePasteHandler.current);
    document.removeEventListener("cut",                    stableCutHandler.current);
    document.removeEventListener("contextmenu",            stableContextMenuHandler.current);

    console.log("Anti-cheating monitoring stopped");
  }, []); // no deps — reads only stable refs

  // ── Auto-cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isActiveRef.current   = false;
      monitoringRef.current = false;

      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

      document.removeEventListener("visibilitychange",       stableVisibilityHandler.current);
      document.removeEventListener("fullscreenchange",       stableFullscreenHandler.current);
      document.removeEventListener("webkitfullscreenchange", stableFullscreenHandler.current);
      document.removeEventListener("mozfullscreenchange",    stableFullscreenHandler.current);
      document.removeEventListener("msfullscreenchange",     stableFullscreenHandler.current);
      document.removeEventListener("copy",                   stableCopyHandler.current);
      document.removeEventListener("paste",                  stablePasteHandler.current);
      document.removeEventListener("cut",                    stableCutHandler.current);
      document.removeEventListener("contextmenu",            stableContextMenuHandler.current);

      // Exit fullscreen if still active
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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs only on unmount

  // ── Summary (reads refs — never stale React state) ────────────────────────
  const getSummary = useCallback(() => ({
    tabSwitchCount:      tabSwitchCountRef.current,
    fullscreenExitCount: fullscreenExitCountRef.current,
    copyAttemptCount:    copyAttemptCountRef.current,
    pasteAttemptCount:   pasteAttemptCountRef.current,
    cutAttemptCount:     cutAttemptCountRef.current,
    violations:          [...violationsRef.current],
  }), []); // no deps — reads only refs

  return {
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
  };
}
