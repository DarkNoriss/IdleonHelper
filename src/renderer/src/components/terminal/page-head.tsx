import type { ReactNode } from "react";

type PageHeadProps = {
  path: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
};

export const PageHead = ({
  path,
  title,
  description,
  actions,
}: PageHeadProps) => (
  <div className="mb-3">
    <div className="mb-0.5 font-mono text-[10px] text-text-muted">
      <span className="text-primary">~</span> / {path}
    </div>
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="m-0 font-medium font-mono text-[18px] text-foreground tracking-[-0.2px]">
          <span className="text-primary">❯</span> {title}
        </h1>
        {description && (
          <div className="mt-1 max-w-[620px] text-[11.5px] text-text-dim leading-[1.5]">
            {description}
          </div>
        )}
      </div>
      {actions}
    </div>
  </div>
);
