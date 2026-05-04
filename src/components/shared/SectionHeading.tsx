import { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-black uppercase text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-3xl font-black uppercase tracking-normal text-white md:text-4xl">
          {title}
        </h2>
      </div>
      {children ? (
        <div className="max-w-md text-sm leading-6 text-muted-foreground">
          {children}
        </div>
      ) : null}
    </div>
  );
}
