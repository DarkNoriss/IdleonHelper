import { Tabs } from "@base-ui/react/tabs";
import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TermTab<T extends string> = {
  value: T;
  label: string;
};

type TermTabsProps<T extends string> = {
  tabs: readonly TermTab<T>[];
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  children?: ReactNode;
  className?: string;
};

// Base UI's Tabs.Tab renders as <button>, whose UA `font` shorthand resets
// font-family + font-size — so explicit `font-mono text-sm` here ensures tab
// labels render in mono at 14px, intentionally larger than the surrounding
// `>` / `.` chrome (10.5px) so the labels read as the primary control.
const TAB_CLASS =
  "cursor-pointer border-0 bg-transparent p-0 font-mono text-sm text-text-dim data-[active]:font-medium data-[active]:text-primary data-[active]:underline data-[active]:decoration-primary-dim data-[active]:underline-offset-[3px]";

export const TermTabs = <T extends string>({
  tabs,
  value,
  defaultValue,
  onValueChange,
  children,
  className,
}: TermTabsProps<T>) => (
  <Tabs.Root
    className={cn("w-full", className)}
    defaultValue={defaultValue}
    onValueChange={onValueChange ? (v) => onValueChange(v as T) : undefined}
    value={value}
  >
    <Tabs.List className="mb-3 flex items-center gap-0 border-border-soft border-b pb-1.5 font-mono text-[10.5px] text-text-muted">
      <span className="mr-1.5 text-primary">›</span>
      {tabs.map((tab, i) => (
        <Fragment key={tab.value}>
          {i > 0 && <span className="px-1.5 text-text-muted">·</span>}
          <Tabs.Tab className={TAB_CLASS} value={tab.value}>
            {tab.label}
          </Tabs.Tab>
        </Fragment>
      ))}
    </Tabs.List>
    {children}
  </Tabs.Root>
);
