"use client";

import { useCallback, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MemoList } from "@/components/memo-list";
import { MemoTransfer } from "@/components/memo-transfer";
import { RecorderPanel } from "@/components/recorder-panel";
import { database, type Memo } from "@/lib/db";
import { deleteMemo, listMemos, restoreMemo } from "@/lib/data/memos";
import { useStorageStatus, useStoredQuery } from "@/lib/storage/react";
import { toast } from "sonner";

/**
 * The whole product as one client island: the recorder, the live memo list from Dexie, and the
 * single playback channel — only one memo plays at a time, and deleting a playing memo stops it.
 */
export function MemoApp() {
  const { data: memos, isLoading } = useStoredQuery(database, listMemos);
  const storageStatus = useStorageStatus(database);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPlayingId(null);
  }, []);

  const togglePlay = (memo: Memo) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playingId === memo.id) {
      stopPlayback();
      return;
    }
    stopPlayback();
    const url = URL.createObjectURL(memo.audio);
    urlRef.current = url;
    audio.src = url;
    audio.currentTime = 0;
    setPlayingId(memo.id);
    audio.play().catch((error: unknown) => {
      setPlayingId(null);
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("This recording could not be played.");
    });
  };

  const handleDelete = async (memo: Memo) => {
    if (playingId === memo.id) stopPlayback();
    try {
      const deleted = await deleteMemo(memo.id);
      if (!deleted) return;
      toast(`Deleted ${memo.name}`, {
        action: {
          label: "Undo",
          onClick: () => {
            restoreMemo(deleted).catch((error: unknown) => {
              toast.error(`Could not restore the memo: ${error instanceof Error ? error.message : "unknown error"}`);
            });
          },
        },
      });
    } catch (error) {
      toast.error(`Could not delete the memo: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {storageStatus === "memory" && (
        <Alert>
          <AlertTitle>This browser will not keep your memos</AlertTitle>
          <AlertDescription>
            Storage is blocked here, so memos vanish when the tab closes. Export them to a file to
            keep them.
          </AlertDescription>
        </Alert>
      )}

      <RecorderPanel />

      <section aria-label="Your memos" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          Your memos{memos?.length ? ` (${memos.length})` : ""}
        </h2>
        <MemoList
          memos={memos}
          isLoading={isLoading}
          playingId={playingId}
          onTogglePlay={togglePlay}
          onDelete={(memo) => void handleDelete(memo)}
        />
      </section>

      <MemoTransfer />

      <audio ref={audioRef} hidden onEnded={stopPlayback} onError={() => {
        if (playingId === null) return;
        setPlayingId(null);
        toast.error("This recording could not be played.");
      }} />
    </div>
  );
}