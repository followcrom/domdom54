import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

// How long to wait for a clip to start after the user taps play before we treat
// it as a load failure. expo-audio's status exposes no error field, so a timeout
// is the reliable cross-platform way to detect "it never loaded".
const LOAD_TIMEOUT_MS = 12000;

// How long the "does this file exist?" check may take before we give up on it.
const PREFLIGHT_TIMEOUT_MS = 8000;

// Statuses that mean the file is not there, as opposed to the network failing.
// 403 is included because S3 answers 403, not 404, for a missing key when the
// bucket doesn't allow listing. Anything else (including 405 from a server that
// doesn't support HEAD) is treated as "can't tell" and playback is attempted.
const MISSING_STATUSES = new Set([403, 404, 410]);

const MISSING_MESSAGE = "This audio isn't available yet.";
const NETWORK_MESSAGE =
  "Couldn't load the audio. Check your connection and try again.";

/**
 * What a HEAD request says about the clip before anyone taps play.
 *   checking - request in flight
 *   ok       - the server has it (or answered in a way we can't interpret)
 *   missing  - the server says it doesn't exist; retrying won't help
 *   offline  - the request itself failed; retrying might
 */
type Availability = "checking" | "ok" | "missing" | "offline";

type AudioPlayback = {
  isPlaying: boolean;
  // True while a clip the user asked to play is still loading/buffering.
  isLoadingPlayback: boolean;
  // Non-null when the clip failed to load; show this to the user.
  audioError: string | null;
  togglePlayPause: () => void;
  // Stop playback and rewind; safe to call during navigation/unmount.
  stop: () => void;
};

/**
 * Wraps an expo-audio player with play/pause, a loading state (for a spinner),
 * and load-failure detection (for a user-facing message). Pass the audio URL to
 * play; pass null when there is no audio.
 */
export function useAudioPlayback(audioUrl: string | null): AudioPlayback {
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);

  // The user tapped play and is waiting for playback to begin.
  const [wantsToPlay, setWantsToPlay] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [availability, setAvailability] = useState<Availability>("ok");

  const isPlaying = !!status?.playing;
  const isLoadingPlayback = wantsToPlay && !isPlaying && !audioError;

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Load the source when the URL changes, without auto-playing - and stop
  // playback when it changes to null. Either way, reset any transient
  // play/error state left over from a previous clip.
  useEffect(() => {
    clearTimer();
    setWantsToPlay(false);
    setAudioError(null);
    if (audioUrl) {
      player.replace(audioUrl);
      player.pause();
    } else {
      // No source means nothing should be playing: a phrase that carries no
      // audio (search results) also hides the pause control, so leaving the
      // previous clip running would strand the user with unstoppable audio.
      try {
        player.pause();
        player.seekTo(0);
      } catch {
        // Player already released (unmount in progress) - nothing to stop.
      }
    }
  }, [audioUrl, player, clearTimer]);

  // Check the file exists as soon as the URL is known. expo-audio reports no load
  // errors, so without this a missing file looked exactly like a slow network: a
  // 12-second spinner and then "please try again", which for a file that hasn't
  // been uploaded yet is advice that can never work. A HEAD request answers in
  // milliseconds and tells the two cases apart.
  useEffect(() => {
    if (!audioUrl) {
      setAvailability("ok");
      return;
    }
    setAvailability("checking");
    // Set by the cleanup when the URL changes or the screen unmounts, so a stale
    // answer can't overwrite the newer check's. A timeout abort leaves it false
    // and lands in catch as "offline", which is what a hung request is.
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PREFLIGHT_TIMEOUT_MS);
    fetch(audioUrl, { method: "HEAD", signal: controller.signal })
      .then((res) => {
        if (!cancelled) {
          setAvailability(MISSING_STATUSES.has(res.status) ? "missing" : "ok");
        }
      })
      .catch(() => {
        if (!cancelled) setAvailability("offline");
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [audioUrl]);

  // A tap made while the check was still running: if the answer is "missing",
  // say so now instead of letting the load timer run out.
  useEffect(() => {
    if (wantsToPlay && availability === "missing") {
      clearTimer();
      setWantsToPlay(false);
      setAudioError(MISSING_MESSAGE);
    }
  }, [wantsToPlay, availability, clearTimer]);

  // Once a requested source finishes loading, start playback.
  useEffect(() => {
    if (wantsToPlay && status?.isLoaded && !status?.playing) {
      player.play();
    }
  }, [wantsToPlay, status?.isLoaded, status?.playing, player]);

  // Playback actually started: drop the spinner state and the failure timer.
  useEffect(() => {
    if (isPlaying) {
      setWantsToPlay(false);
      clearTimer();
    }
  }, [isPlaying, clearTimer]);

  // Reset to the start when the clip finishes.
  useEffect(() => {
    if (status?.didJustFinish) {
      player.pause();
      player.seekTo(0);
    }
  }, [status?.didJustFinish, player]);

  // Clean up the failure timer on unmount. We deliberately do NOT pause/seek
  // the player here: expo-audio releases it automatically on unmount, and
  // calling its methods afterwards throws "shared object already released".
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const togglePlayPause = useCallback(() => {
    setAudioError(null);

    // Known missing: say so immediately. No spinner, no timer, nothing to retry.
    if (availability === "missing") {
      setAudioError(MISSING_MESSAGE);
      return;
    }

    if (isPlaying) {
      player.pause();
      setWantsToPlay(false);
      clearTimer();
      return;
    }

    // Already loaded — just play.
    if (player.isLoaded) {
      player.play();
      return;
    }

    // Not loaded yet: show the spinner, play as soon as it loads, and arm a
    // timeout so a clip that never loads surfaces an error instead of hanging.
    // A missing file is caught by the check above, so by the time this timer
    // fires the likely cause is the connection, and the message says so.
    // ("offline" from the check still attempts playback - the network may have
    // come back since.)
    setWantsToPlay(true);
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      if (!player.playing) {
        setWantsToPlay(false);
        setAudioError(NETWORK_MESSAGE);
      }
    }, LOAD_TIMEOUT_MS);
  }, [isPlaying, player, clearTimer, availability]);

  // Stop playback and rewind, e.g. when the user navigates away. Guarded: a
  // blur can race with the unmount that follows, by which point expo-audio may
  // already have released the player.
  const stop = useCallback(() => {
    clearTimer();
    setWantsToPlay(false);
    try {
      player.pause();
      player.seekTo(0);
    } catch {
      // Player already released (unmount in progress) — nothing to stop.
    }
  }, [player, clearTimer]);

  // Stop playback whenever the screen loses focus, so audio never bleeds across
  // screens. The cleanup runs on blur (including tab switches that keep the
  // screen mounted) and on unmount; stop() is guarded for the released player.
  useFocusEffect(
    useCallback(() => {
      return () => {
        stop();
      };
    }, [stop])
  );

  return { isPlaying, isLoadingPlayback, audioError, togglePlayPause, stop };
}
