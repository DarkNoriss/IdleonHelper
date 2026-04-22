type StepProps = {
  num: string;
  label: string;
  onJump?: () => void;
};

export const Step = ({ num, label, onJump }: StepProps) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-text-muted">{num}</span>
    <span className="flex-1 text-foreground">{label}</span>
    {onJump && (
      <button
        className="cursor-pointer rounded-sm border border-border bg-surface px-2 py-0.5 font-mono text-[9.5px] text-amber hover:bg-surface-hi"
        onClick={onJump}
        type="button"
      >
        open →
      </button>
    )}
  </div>
);
