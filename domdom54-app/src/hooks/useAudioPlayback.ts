import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

// How long to wait for a clip to start after the user taps play before we treat
// it as a load failure. expo-audio's status exposes no error field, so a timeout
// is the reliable cross-platform way to detect "it never loaded".
const LOAD_TIMEOUT_MS = 12000;

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

  const isPlaying = !!status?.playing;
  const isLoadingPlayback = wantsToPlay && !isPlaying && !audioError;

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Load the source when the URL changes, without auto-playing. Reset any
  // transient play/error state left over from a previous clip.
  useEffect(() => {
    clearTimer();
    setWantsToPlay(false);
    setAudioError(null);
    if (audioUrl) {
      player.replace(audioUrl);
      player.pause();
    }
  }, [audioUrl, player, clearTimer]);

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
    setWantsToPlay(true);
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      if (!player.playing) {
        setWantsToPlay(false);
        setAudioError("Audio failed to load. Please try again.");
      }
    }, LOAD_TIMEOUT_MS);
  }, [isPlaying, player, clearTimer]);

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
