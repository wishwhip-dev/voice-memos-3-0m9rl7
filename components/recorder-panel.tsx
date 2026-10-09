"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  micLevel,
  recordMicrophone,
  requestMicrophone,
  stopStream,
  unlockAudio,
  type MicrophoneRecorder,
  type Recording,
} from "@/lib/audio";
import { addMemo, nextMemoNumber } from "@/lib/data/memos";
import { formatDuration } from "@/lib/format";

type MicState =
  | { state: "off" }
  | { state: "on"; stream: MediaStream }
  | { state: "refused"; message: string };

/** Ten minutes, so a recording left running ends itself and still gets saved. */
const MAX_RECORDING_MS = 10 * 60_000;

/**
 * The recorder: one Record/Stop button, the elapsed time and a level meter while it runs, and the
 * saved memo written to Dexie on stop. Microphone access is asked from the button, never on load,
 * and every way it can be refused is shown as text on the page.
 */
export function RecorderPanel() {
  const [mic, setMic] = useState<MicState>({ state: "off" });
  const [requesting, setRequesting] = useState(false);
  const [recorder, setRecorder] = useState<MicrophoneRecorder | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);

  const startedAtRef = useRef(0);

  useEffect(() => {
    if (mic.state !== "on") return;
    return micLevel(mic.stream, setLevel);
  }, [mic]);

  // Leaving the page (or this component) releases the microphone even mid-recording; the
  // half-made audio is simply never written, so no partial memo is left behind.
  useEffect(() => {
    if (mic.state !== "on") return;
    const stream = mic.stream;
    return () => stopStream(stream);
  }, [mic]);

  useEffect(() => {
    if (!recorder) return;
    const timer = window.setInterval(() => {
      setElapsedMs(performance.now() - startedAtRef.current);
    }, 200);
    return () => window.clearInterval(timer);
  }, [recorder]);

  const saveRecording = async (recording: Recording, stream: MediaStream) => {
    setRecorder(null);
    setLevel(0);
    setElapsedMs(0);
    stopStream(stream);
    setMic({ state: "off" });
    try {
      const number = await nextMemoNumber();
      const memo = await addMemo({
        name: `Memo ${number}`,
        number,
        recordedAt: Date.now(),
        durationMs: recording.durationMs,
        audio: recording.blob,
        mimeType: recording.mimeType,
      });
      toast.success(`Saved ${memo.name}`, { description: `${formatDuration(recording.durationMs)} of audio, kept in this browser.` });
    } catch (error) {
      toast.error(`Could not save the memo: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  };

  const handleRecord = async () => {
    if (recorder) {
      void recorder.stop(); // resolves through onStop, which saves and cleans up
      return;
    }
    setRequesting(true);
    try {
      await unlockAudio();
      const result = await requestMicrophone();
      if (result.status !== "granted") {
        setMic({ state: "refused", message: result.message });
        return;
      }
      const stream = result.stream;
      const next = recordMicrophone(stream, {
        maxMs: MAX_RECORDING_MS,
        onStop: (recording) => void saveRecording(recording, stream),
      });
      try {
        next.start();
      } catch (error) {
        stopStream(stream);
        setMic({ state: "refused", message: error instanceof Error ? error.message : "The recording could not start." });
        return;
      }
      startedAtRef.current = performance.now();
      setElapsedMs(0);
      setLevel(0);
      setMic({ state: "on", stream });
      setRecorder(next);
    } finally {
      setRequesting(false);
    }
  };

  const recording = recorder !== null;
  const levelPercent = Math.round(Math.min(1, level * 4) * 100);

  return (
    <section aria-label="Record a memo" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <Button
          size="lg"
          variant={recording ? "secondary" : "default"}
          className="h-12 min-w-32 px-8 text-base font-semibold"
          disabled={requesting}
          onClick={() => void handleRecord()}
        >
          {recording ? "Stop" : requesting ? "Asking…" : "Record"}
        </Button>

        {recording ? (
          <div className="flex items-center gap-3" aria-live="off">
            {/* The recording indicator: a pulsing red dot, plus the word itself. */}
            <span className="flex items-center gap-2 text-sm font-medium text-destructive">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
              </span>
              Recording
            </span>
            <span className="font-mono text-2xl tabular-nums" role="timer" aria-label="Elapsed recording time">
              {formatDuration(elapsedMs)}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Press Record, speak, then press Stop.</p>
        )}
      </div>

      {recording && (
        <div
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={levelPercent}
          aria-label="Microphone level"
          className="h-3 w-full overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-100" style={{ width: `${levelPercent}%` }} />
        </div>
      )}

      {mic.state === "refused" && (
        <Alert variant="destructive">
          <AlertTitle>No microphone access</AlertTitle>
          <AlertDescription>
            {mic.message} Press Record to try again.
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
}