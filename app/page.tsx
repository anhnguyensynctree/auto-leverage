import EntryForm from "@/components/EntryForm";

export default function Home() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center">
      <header className="w-full max-w-[640px] mx-auto px-8 py-6">
        <span className="text-sm font-light text-outline">auto-leverage</span>
      </header>

      <main className="flex-grow w-full max-w-[640px] px-8 pt-12 md:pt-24 flex flex-col gap-12">
        <section className="flex flex-col gap-6 text-center">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-wide bg-primary/10 text-primary border border-primary/20">
              ✦ Karpathy&apos;s autoresearch, made simple
            </span>
          </div>
          <h1 className="text-[28px] font-semibold text-on-surface leading-tight tracking-tight">
            What do you want to change about your AI research run?
          </h1>
          <p className="text-[15px] text-outline leading-relaxed max-w-[440px] mx-auto">
            Describe your goal in plain English. We&apos;ll figure out exactly
            which part of autoresearch to adjust and hand you a ready-to-paste
            prompt — no configuration knowledge needed.
          </p>
        </section>

        <section>
          <EntryForm />
        </section>
      </main>

      <footer className="w-full flex justify-center pb-12 pt-8">
        <span className="text-xs font-medium uppercase tracking-widest text-outline opacity-90">
          No account needed.
        </span>
      </footer>
    </div>
  );
}
