type QuickTileProps = {
  label: string;
  desc: string;
  onClick: () => void;
};

export const QuickTile = ({ label, desc, onClick }: QuickTileProps) => (
  <button
    className="cursor-pointer rounded-[4px] border border-border-soft bg-surface px-2.5 py-2 text-left font-mono transition-colors hover:bg-surface-hi"
    onClick={onClick}
    type="button"
  >
    <div className="font-medium text-[11px] text-foreground">
      <span className="text-primary">❯</span> {label}
    </div>
    <div className="mt-0.5 text-[10px] text-text-muted">{desc}</div>
  </button>
);
