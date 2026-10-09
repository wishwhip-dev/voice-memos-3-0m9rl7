import { database, newId, type Memo } from "@/lib/db";

/** Components call these, never Dexie directly. */

const memos = async () => (await database.ready()).memos;

/** Every memo, newest first. */
export async function listMemos(): Promise<Memo[]> {
  return (await memos()).orderBy("recordedAt").reverse().toArray();
}

/** The number the next default name gets, so "Memo 1, Memo 2, …" never repeats. */
export async function nextMemoNumber(): Promise<number> {
  const highest = await (await memos()).orderBy("number").last();
  return (highest?.number ?? 0) + 1;
}

export type NewMemo = {
  name: string;
  number: number;
  recordedAt: number;
  durationMs: number;
  audio: Blob;
  mimeType: string;
};

export async function addMemo(memo: NewMemo): Promise<Memo> {
  const record: Memo = { id: newId(), ...memo };
  await (await memos()).add(record);
  return record;
}

export async function renameMemo(id: string, name: string): Promise<void> {
  await (await memos()).update(id, { name });
}

export async function deleteMemo(id: string): Promise<Memo | undefined> {
  const table = await memos();
  const memo = await table.get(id);
  if (!memo) return undefined;
  await table.delete(id);
  return memo;
}

/** Put a memo back, whole — used by the undo on Delete. */
export async function restoreMemo(memo: Memo): Promise<void> {
  await (await memos()).put(memo);
}

export async function countMemos(): Promise<number> {
  return (await memos()).count();
}

// --- Export and import -------------------------------------------------------------
//
// `lib/storage/transfer.ts` moves tables as JSON, and a Blob serialises to `{}` there — audio would
// come back empty. So the memos travel in their own envelope, with each recording as base64. This
// is still the one database (`database`), just carried in a shape that survives the trip.

const EXPORT_APP = "voice-memos";
const EXPORT_VERSION = 1;

export type MemoExport = {
  app: string;
  schemaVersion: number;
  exportedAt: number;
  memos: Array<{
    id: string;
    name: string;
    number: number;
    recordedAt: number;
    durationMs: number;
    mimeType: string;
    audioBase64: string;
  }>;
};

function toBase64(bytes: Uint8Array): string {
  let text = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    text += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(text);
}

function fromBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function buildExport(): Promise<MemoExport> {
  const all = await listMemos();
  return {
    app: EXPORT_APP,
    schemaVersion: EXPORT_VERSION,
    exportedAt: Date.now(),
    memos: await Promise.all(
      all.map(async (memo) => ({
        id: memo.id,
        name: memo.name,
        number: memo.number,
        recordedAt: memo.recordedAt,
        durationMs: memo.durationMs,
        mimeType: memo.mimeType,
        audioBase64: toBase64(new Uint8Array(await memo.audio.arrayBuffer())),
      })),
    ),
  };
}

/**
 * Apply an export file, replacing what is here. Throws with a message fit for the screen when the
 * file is not this app's export — a bad file changes nothing, because validation runs before any
 * write.
 */
export async function applyExport(parsed: unknown): Promise<number> {
  if (typeof parsed !== "object" || parsed === null) throw new Error("The file is not a Voice Memos export.");
  const { app, schemaVersion, memos: rows } = parsed as Record<string, unknown>;
  if (app !== EXPORT_APP) throw new Error("The file is not a Voice Memos export.");
  if (schemaVersion !== EXPORT_VERSION) throw new Error(`The export was made by a different version of the app (schema ${String(schemaVersion)}).`);
  if (!Array.isArray(rows)) throw new Error("The export holds no memos.");
  const records: Memo[] = [];
  for (const row of rows) {
    if (typeof row !== "object" || row === null) throw new Error("The export holds a memo this app cannot read.");
    const { id, name, number, recordedAt, durationMs, mimeType, audioBase64 } = row as Record<string, unknown>;
    if (typeof id !== "string" || typeof name !== "string" || typeof audioBase64 !== "string") {
      throw new Error("The export holds a memo this app cannot read.");
    }
    records.push({
      id,
      name,
      number: typeof number === "number" ? number : 0,
      recordedAt: typeof recordedAt === "number" ? recordedAt : Date.now(),
      durationMs: typeof durationMs === "number" ? durationMs : 0,
      mimeType: typeof mimeType === "string" ? mimeType : "",
      audio: new Blob([fromBase64(audioBase64)], { type: typeof mimeType === "string" ? mimeType : "" }),
    });
  }
  const table = await memos();
  await database.ready();
  await table.clear();
  if (records.length) await table.bulkAdd(records);
  return records.length;
}
