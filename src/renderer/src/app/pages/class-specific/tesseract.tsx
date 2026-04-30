import { TesseractOptimizerTab } from "./tesseract-optimizer-tab";

const Tesseract = () => {
  return (
    <div className="flex flex-col gap-3 p-3">
      <h1 className="font-mono text-sm text-text-dim uppercase tracking-wide">
        tesseract upgrade optimizer
      </h1>
      <TesseractOptimizerTab />
    </div>
  );
};

export default Tesseract;
