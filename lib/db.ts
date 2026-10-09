/**
 * This application's database: voice memos.
 *
 * The reusable half of the setup is in `lib/storage/` and is not edited. This file is the half
 * that describes the product: which tables exist, what is indexed, how the schema has changed over
 * time, and what a first visit starts with.
 */
import { defineDatabase } from "@/lib/storage/database";

export type Memo = {
  id: string;
  /** The name shown in the list. Defaults to "Memo 1", "Memo 2", … by `number`. */
  name: string;
  /** The sequential number the memo was created with, so default names never repeat. */
  number: number;
  /** Epoch millis, indexed: the list is ordered by it, newest first. */
  recordedAt: number;
  /** How long the recording ran, in milliseconds, measured while it recorded. */
  durationMs: number;
  /** The recording itself. Dexie stores Blobs; kept out of JSON exports (a Blob serialises as {}). */
  audio: Blob;
  /** What the browser produced, e.g. `audio/webm;codecs=opus` — kept with the Blob so it can be played back. */
  mimeType: string;
};

/** Ids are generated here so the data layer never depends on an auto-increment round trip. */
export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const database = defineDatabase<{ memos: Memo }>({
  // Part of the origin's storage identity. Renaming it does not migrate anything — it points the
  // application at a different, empty database and abandons the old one in place. That is exactly
  // what you want on a first build, and never what you want afterwards.
  name: "voice-memos",
  versions: [
    // Version 1 indexed only the primary key and `recordedAt`. It was shipped, so it is not edited
    // (docs/storage.md): version 2 adds the `number` index that `nextMemoNumber()` sorts on. Dexie
    // creates the index on open; no data changes.
    { version: 1, stores: { memos: "id, recordedAt" } },
    { version: 2, stores: { memos: "id, recordedAt, number" } },
  ],
  // No seed: a voice memo app opens empty on purpose — the empty state invites the first recording,
  // and there is no honest example content to fake (a seeded memo would have no audio behind it).
});
