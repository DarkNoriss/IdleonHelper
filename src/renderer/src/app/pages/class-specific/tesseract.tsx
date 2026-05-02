import { PageHead } from "@/components/terminal";
import { TesseractOptimizerTab } from "./tesseract-optimizer-tab";

const Tesseract = () => {
  return (
    <>
      <PageHead path="class-specific / tesseract" title="tesseract" />
      <TesseractOptimizerTab />
    </>
  );
};

export default Tesseract;
