"use client";

import { useState } from "react";
import { FileDrop } from "@/components/file-drop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { applyExport, buildExport, type MemoExport } from "@/lib/data/memos";
import { readAsJson, saveBlob } from "@/lib/files";
import { toast } from "sonner";

function isMemoExport(value: unknown): value is MemoExport {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.app === "voice-memos" && candidate.schemaVersion === 1 && Array.isArray(candidate.memos);
}

/**
 * Getting memos on and off the device. Data here lives in one browser only, so a file is the only
 * way it moves — export carries every memo with its audio as base64, and importing replaces what
 * is here after a confirm.
 */
export function MemoTransfer() {
  const [pending, setPending] = useState<{ file: string; data: MemoExport } | null>(null);
  const [working, setWorking] = useState(false);

  const exportMemos = async () => {
    try {
      const data = await buildExport();
      saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "voice-memos.json");
      toast.success(`Exported ${data.memos.length} ${data.memos.length === 1 ? "memo" : "memos"} to a file.`);
    } catch (error) {
      toast.error(`Could not export the memos: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  };

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    try {
      const data = await readAsJson(file, isMemoExport);
      setPending({ file: file.name, data });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The file could not be read.");
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    setWorking(true);
    try {
      const count = await applyExport(pending.data);
      toast.success(`Imported ${count} ${count === 1 ? "memo" : "memos"}. The previous list was replaced.`);
      setPending(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The file could not be imported.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <section aria-label="Back up your memos" className="flex flex-col gap-3 border-t pt-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Memos live in this browser only. Export moves every memo, audio included, into a file;
          importing a file replaces what is here.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Button variant="outline" className="h-11" onClick={() => void exportMemos()}>
          Export memos
        </Button>
        <FileDrop
          accept="application/json,.json"
          label="Import memos"
          className="min-w-0 flex-1 py-4"
          onFiles={(files) => void handleFiles(files)}
        >
          or drop a Voice Memos export here
        </FileDrop>
      </div>

      <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Replace your memos?</DialogTitle>
            <DialogDescription>
              Importing {pending?.file} replaces every memo currently in this browser with the{" "}
              {pending?.data.memos.length ?? 0} {pending?.data.memos.length === 1 ? "memo" : "memos"} in
              the file. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={working} onClick={() => void confirmImport()}>
              Replace memos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}