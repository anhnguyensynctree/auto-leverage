import EntryForm from "@/components/EntryForm";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center">
      <header className="w-full max-w-[640px] mx-auto px-8 py-6 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-widest text-on-surface-variant uppercase">
          auto-leverage
        </span>
      </header>

      <main className="flex-grow w-full max-w-[640px] px-8 pt-10 md:pt-20 flex flex-col gap-12">
        <section className="flex flex-col gap-5 text-center">
          <h1 className="text-[28px] md:text-[36px] font-bold text-on-surface leading-snug tracking-tight max-w-[460px] mx-auto">
            Optimize your <span className="text-primary">AI research runs</span>
          </h1>
          <p className="text-[15px] text-on-surface-variant leading-relaxed max-w-[400px] mx-auto">
            Describe your goal — we&apos;ll turn it into a strategy you can run
            in ChatGPT, Gemini, or Claude.
          </p>
        </section>

        <section>
          <EntryForm />
        </section>
      </main>

      <footer className="w-full flex justify-center pb-12 pt-8">
        <span className="text-xs font-medium uppercase tracking-widest text-secondary opacity-60">
          No account needed.
        </span>
      </footer>
    </div>
  );
}
