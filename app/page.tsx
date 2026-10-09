import { MemoApp } from "@/components/memo-app";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Voice memos</h1>
        <p className="text-muted-foreground">
          Record from your microphone, name each memo, and play it back. Everything stays in this
          browser.
        </p>
      </header>
      <MemoApp />
    </main>
  );
}