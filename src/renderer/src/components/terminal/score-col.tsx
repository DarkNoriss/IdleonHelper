type ScoreColProps = {
  label: string;
  current: string;
  diff?: string | null;
};

export const ScoreCol = ({ label, current, diff }: ScoreColProps) => (
  <div>
    <div className="font-medium text-[15px] text-foreground">{current}</div>
    {diff && (
      <div
        className={`mt-px text-[10px] ${diff.startsWith("-") ? "text-destructive" : "text-success"}`}
      >
        {diff}
      </div>
    )}
    <div className="mt-[3px] text-[9px] text-text-muted uppercase tracking-[1px]">
      {label}
    </div>
  </div>
);
