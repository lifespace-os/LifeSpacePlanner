import Link from "next/link"

export function PlaceholderScreen({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center p-6">
      <div className="board-grain w-full max-w-lg rounded-xl border border-line p-10 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">Next screen</p>
        <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight text-balance">{title}</h1>
        <p className="mt-3 text-pretty text-ink-soft">{description}</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-ink px-4 py-2 text-sm text-board transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Back to the whiteboard
        </Link>
      </div>
    </main>
  )
}
