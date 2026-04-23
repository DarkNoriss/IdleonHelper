import { useMainState } from "@/hooks/use-main-state";

export const DevBanner = (): React.JSX.Element | null => {
  const devServer = useMainState("devServer");
  if (!devServer || devServer.port === null) {
    return null;
  }
  return (
    <div
      className="flex items-center justify-center gap-4 border-amber-500/40 border-b bg-amber-500/10 px-3 py-1 text-amber-300 text-xs"
      role="status"
    >
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
        Dev command server: 127.0.0.1:{devServer.port}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
        Panic armed (Ctrl+Esc)
      </span>
    </div>
  );
};
