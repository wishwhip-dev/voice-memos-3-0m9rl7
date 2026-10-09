"use client";

import { useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { Memo } from "@/lib/db";
import { renameMemo } from "@/lib/data/memos";
import { formatDateTime, formatDuration } from "@/lib/format";
import { toast } from "sonner";

type MemoListProps = {
  memos: Memo[] | undefined;
  isLoading: boolean;
  playingId: string | null;
  onTogglePlay: (memo: Memo) => void;
  onDelete: (memo: Memo) => void;
};

export function MemoList({ memos, isLoading, playingId, onTogglePlay, onDelete }: MemoListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-label="Loading memos">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!memos?.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
          <p className="text-lg font-semibold">No memos yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Press Record above to capture your first voice memo. It is saved in this browser and
            stays here after a reload.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ol className="flex flex-col gap-3" aria-label="Saved memos">
      {memos.map((memo) => (
        <li key={memo.id}>
          <MemoRow memo={memo} playing={playingId === memo.id} onTogglePlay={onTogglePlay} onDelete={onDelete} />
        </li>
      ))}
    </ol>
  );
}

type MemoRowProps = {
  memo: Memo;
  playing: boolean;
  onTogglePlay: (memo: Memo) => void;
  onDelete: (memo: Memo) => void;
};

function MemoRow({ memo, playing, onTogglePlay, onDelete }: MemoRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memo.name);
  const [saving, setSaving] = useState(false);
  const cancelledRef = useRef(false);
  const inputId = useId();

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setEditing(false);
    const name = draft.trim();
    // An empty or whitespace-only name keeps the previous one.
    if (!name || name === memo.name) {
      setSaving(false);
      return;
    }
    try {
      await renameMemo(memo.id, name);
    } catch (error) {
      toast.error(`Could not rename the memo: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <form
        aria-label={`Rename ${memo.name}`}
        className="flex flex-col gap-2 rounded-lg border border-primary bg-accent/40 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Label htmlFor={inputId}>Memo name</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id={inputId}
            value={draft}
            autoFocus
            autoComplete="off"
            className="min-w-0 flex-1 basis-48"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                cancelledRef.current = true;
                setEditing(false);
              }
            }}
            onBlur={() => {
              if (cancelledRef.current) {
                cancelledRef.current = false;
                return;
              }
              void save();
            }}
          />
          {/* mousedown is stopped so clicking Save does not blur the input first and unmount the form. */}
          <Button type="submit" className="h-11" onMouseDown={(event) => event.preventDefault()}>
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="block max-w-full truncate text-left text-base font-medium underline-offset-4 hover:underline focus-visible:underline"
          title="Click to rename"
          aria-label={`Rename ${memo.name}`}
          onClick={() => {
            cancelledRef.current = false;
            setDraft(memo.name);
            setEditing(true);
          }}
        >
          {memo.name}
        </button>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="tabular-nums">{formatDuration(memo.durationMs)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDateTime(memo.recordedAt)}</span>
          {playing && (
            <Badge className="animate-pulse" variant="secondary">
              Playing
            </Badge>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => onTogglePlay(memo)}>
          {playing ? "Stop" : "Play"}
        </Button>
        <Button
          variant="ghost"
          className="h-11 flex-1 text-destructive hover:text-destructive sm:flex-none"
          onClick={() => onDelete(memo)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}