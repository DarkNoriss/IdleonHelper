import { compassScripts } from "./compass/index";
import { grimoireScripts } from "./grimoire/index";
import { tesseractScripts } from "./tesseract/index";

export const classSpecificScripts = [
  ...compassScripts,
  ...tesseractScripts,
  ...grimoireScripts,
];
