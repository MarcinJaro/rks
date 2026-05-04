export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="border-b border-white/8 bg-muted py-14">
      <div className="container-page">
        <p className="mb-3 text-sm font-black uppercase text-primary">
          RKS Okęcie Warszawa
        </p>
        <h1 className="max-w-3xl text-4xl font-black uppercase tracking-normal text-white md:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
    </section>
  );
}
