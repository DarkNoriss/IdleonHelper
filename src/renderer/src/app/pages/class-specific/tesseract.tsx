import { PageHead } from "@/components/terminal";
import { TesseractOptimizerTab } from "./tesseract-optimizer-tab";

const Tesseract = () => {
  return (
    <>
      <PageHead
        description="optimal upgrade order across damage, accuracy, defence, crit, attack speed, or extra tachyons. rows are sorted by efficiency."
        path="class-specific / tesseract"
        title="tesseract"
      />
      <TesseractOptimizerTab />
    </>
  );
};

export default Tesseract;
