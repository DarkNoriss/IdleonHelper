const SHEET_ID = "1o4g1_CQCfjrVzhaMKBcpKDv-o1zqjH0bVt22KwTXeLA";
const GID = "0";

const getSheetUrl = (range: string): string => {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}&range=${range}`;
};

export type WeeklyBattleStep = {
  stepName: string;
  steps: number[];
  rawSteps: string[];
};

export type WeeklyBattleInfo = {
  dateFrom: string;
  dateTo: string;
  bossName: string;
  steps: WeeklyBattleStep[];
};

export type WeeklyBattleData = {
  fetchedAt: string;
  info: WeeklyBattleInfo;
};

const fetchRange = async (range: string): Promise<string[][]> => {
  const url = getSheetUrl(range);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch range ${range}: ${response.status} ${response.statusText}`
    );
  }
  const csv = await response.text();
  return parseCSV(csv);
};

const parseCSV = (csv: string): string[][] => {
  const lines: string[][] = [];
  const rows = csv.split("\n");

  for (const row of rows) {
    if (row.trim() === "") {
      continue;
    }

    const fields: string[] = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];

      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        fields.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }

    fields.push(currentField.trim());
    lines.push(fields);
  }

  return lines;
};

const parseDate = (dateStr: string): string | null => {
  if (!dateStr || dateStr.trim() === "" || dateStr === "—") {
    return null;
  }

  const match = dateStr.match(/^(\d{1,2})\s+(\w+)\s+(\d{2,4})$/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match as [string, string, string, string];
  const monthNames = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const monthIndex = monthNames.indexOf(month.toLowerCase().slice(0, 3));
  if (monthIndex === -1) {
    return null;
  }

  const fullYear = year.length === 2 ? `20${year}` : year;
  const date = new Date(
    Number.parseInt(fullYear, 10),
    monthIndex,
    Number.parseInt(day, 10)
  );
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().split("T")[0]!;
};

const extractNumbers = (str: string): number[] => {
  if (!str || str.trim() === "") {
    return [];
  }

  const cleaned = str
    .replace(/\([^)]*\)/g, "")
    .replace(/[^\d\s-]/g, "")
    .trim();

  const numbers: number[] = [];
  const parts = cleaned.split(/[\s-]+/);

  for (const part of parts) {
    const num = Number.parseInt(part, 10);
    if (!Number.isNaN(num)) {
      numbers.push(num);
    }
  }

  return numbers;
};

export const fetchWeeklyBattleData = async (): Promise<WeeklyBattleData> => {
  const [headerData, skullsData, trophyData] = await Promise.all([
    fetchRange("F2:L4"),
    fetchRange("F10:H50"),
    fetchRange("J10:L50"),
  ]);

  let dateFrom: string | null = null;
  let dateTo: string | null = null;
  let bossName: string | null = null;
  for (const row of headerData) {
    const dateIndices: number[] = [];
    let dashIndex = -1;

    for (let i = 0; i < row.length; i++) {
      const cell = (row[i] || "").trim();
      if (parseDate(cell)) {
        dateIndices.push(i);
      } else if (cell === "-" || cell === "—") {
        dashIndex = i;
      }
    }

    if (dateIndices.length >= 2 && dashIndex !== -1) {
      const beforeDash = dateIndices.filter((idx) => idx < dashIndex);
      const afterDash = dateIndices.filter((idx) => idx > dashIndex);
      if (beforeDash.length > 0 && afterDash.length > 0) {
        const beforeIdx = beforeDash.at(-1)!;
        const afterIdx = afterDash[0]!;
        dateFrom = parseDate(row[beforeIdx]!) || row[beforeIdx]!;
        dateTo = parseDate(row[afterIdx]!) || row[afterIdx]!;
      }
    } else if (dateIndices.length >= 2) {
      const firstIdx = dateIndices[0]!;
      const secondIdx = dateIndices[1]!;
      dateFrom = parseDate(row[firstIdx]!) || row[firstIdx]!;
      dateTo = parseDate(row[secondIdx]!) || row[secondIdx]!;
    }

    for (const cell of row) {
      const trimmed = (cell || "").trim();
      if (
        trimmed &&
        !parseDate(trimmed) &&
        trimmed !== "—" &&
        trimmed !== "-" &&
        trimmed.toLowerCase() !== "current run" &&
        !bossName
      ) {
        bossName = trimmed;
      }
    }
  }

  if (!(dateFrom && dateTo && bossName)) {
    throw new Error("Failed to parse dates or boss name from header data");
  }

  const skullsNumbers: number[] = [];
  const skullsRawSteps: string[] = [];
  for (const row of skullsData) {
    const cell = (row[0] || "").trim();
    if (
      cell &&
      !cell.toLowerCase().includes("bonus") &&
      !cell.toLowerCase().includes("exp") &&
      !cell.toLowerCase().includes("dmg")
    ) {
      skullsRawSteps.push(cell);
      const numbers = extractNumbers(cell);
      skullsNumbers.push(...numbers);
    }
  }

  const trophyNumbers: number[] = [];
  const trophyRawSteps: string[] = [];
  for (const row of trophyData) {
    const cell = (row[0] || "").trim();
    if (
      cell &&
      !cell.toLowerCase().includes("bonus") &&
      !cell.toLowerCase().includes("exp") &&
      !cell.toLowerCase().includes("dmg") &&
      !cell.toLowerCase().includes("misc") &&
      !cell.toLowerCase().includes("trophy")
    ) {
      trophyRawSteps.push(cell);
      const numbers = extractNumbers(cell);
      trophyNumbers.push(...numbers);
    }
  }

  let skullsNumber = "";
  let trophyNumber = "";
  if (skullsData.length > 0) {
    for (const rawCell of skullsData[0]!) {
      const cell = (rawCell || "").trim();
      if (cell.toLowerCase().includes("skull")) {
        const match = cell.match(/(\d+)/);
        if (match) {
          skullsNumber = match[1]!;
          break;
        }
      }
    }
  }

  for (const row of headerData) {
    for (let i = 0; i < row.length; i++) {
      const cell = (row[i] || "").trim();
      if (cell.toLowerCase().includes("trophy")) {
        for (let offset = 1; offset <= 3 && i + offset < row.length; offset++) {
          const numCell = (row[i + offset] || "").trim();
          if (/^\d+$/.test(numCell)) {
            trophyNumber = numCell;
            break;
          }
        }
      }
    }
  }

  if (!trophyNumber && trophyData.length > 0) {
    const trophyRow = trophyData[0]!;
    for (let i = 0; i < trophyRow.length; i++) {
      const cell = (trophyRow[i] || "").trim();
      if (cell.toLowerCase().includes("trophy")) {
        for (
          let offset = 1;
          offset <= 3 && i + offset < trophyRow.length;
          offset++
        ) {
          const numCell = (trophyRow[i + offset] || "").trim();
          if (/^\d+$/.test(numCell)) {
            trophyNumber = numCell;
            break;
          }
        }
      }
    }
  }

  const skullsStepName = skullsNumber ? `Skulls ${skullsNumber}` : "Skulls";
  const trophyStepName = trophyNumber ? `Trophy ${trophyNumber}` : "Trophy";

  const info: WeeklyBattleInfo = {
    dateFrom,
    dateTo,
    bossName,
    steps: [
      {
        stepName: skullsStepName,
        steps: skullsNumbers,
        rawSteps: skullsRawSteps,
      },
      {
        stepName: trophyStepName,
        steps: trophyNumbers,
        rawSteps: trophyRawSteps,
      },
    ],
  };

  const data: WeeklyBattleData = {
    fetchedAt: new Date().toISOString(),
    info,
  };

  return data;
};
