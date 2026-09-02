export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="animate-pulse"
    >
      <span className="sr-only">Ładowanie widoku panelu</span>
      <div aria-hidden="true" className="border-b border-border pb-6">
        <div className="h-3 w-24 rounded bg-[#dfe5eb]" />
        <div className="mt-4 h-9 w-60 max-w-full rounded-lg bg-[#dfe5eb]" />
        <div className="mt-3 h-4 w-[520px] max-w-full rounded bg-[#e5eaf0]" />
      </div>
      <div aria-hidden="true" className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-32 rounded-xl border border-border bg-white"
          />
        ))}
      </div>
      <div aria-hidden="true" className="mt-6 h-80 rounded-xl border border-border bg-white" />
    </div>
  );
}
