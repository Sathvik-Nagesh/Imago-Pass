export interface PassportTemplate {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  widthPx: number; // at 300 DPI
  heightPx: number; // at 300 DPI
  description: string;
  defaultBg: string;
  defaultEyeLevel: number;
}

export const templates: PassportTemplate[] = [
  {
    id: "us",
    name: "US Passport (2x2 in)",
    widthMm: 51,
    heightMm: 51,
    widthPx: 600,
    heightPx: 600,
    description: "Standard US passport size (2 x 2 inches).",
    defaultBg: "#FFFFFF",
    defaultEyeLevel: 40
  },
  {
    id: "us_visa",
    name: "US Visa (2x2 in)",
    widthMm: 51,
    heightMm: 51,
    widthPx: 600,
    heightPx: 600,
    description: "Standard US visa size (2 x 2 inches).",
    defaultBg: "#FFFFFF",
    defaultEyeLevel: 40
  },
  {
    id: "uk_eu_au",
    name: "UK / Europe / Australia (35x45 mm)",
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
    description: "Standard size for UK, Europe, Australia, and many others.",
    defaultBg: "#E5E7E9",
    defaultEyeLevel: 30
  },
  {
    id: "schengen_visa",
    name: "Schengen Visa (35x45 mm)",
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
    description: "Standard Schengen visa size.",
    defaultBg: "#E5E7E9",
    defaultEyeLevel: 30
  },
  {
    id: "canada",
    name: "Canada (50x70 mm)",
    widthMm: 50,
    heightMm: 70,
    widthPx: 591,
    heightPx: 827,
    description: "Standard Canadian passport size.",
    defaultBg: "#FFFFFF",
    defaultEyeLevel: 45
  },
  {
    id: "china",
    name: "China (33x48 mm)",
    widthMm: 33,
    heightMm: 48,
    widthPx: 390,
    heightPx: 567,
    description: "Standard Chinese passport size.",
    defaultBg: "#FFFFFF",
    defaultEyeLevel: 40
  },
  {
    id: "japan",
    name: "Japan (35x45 mm)",
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
    description: "Standard Japanese passport size.",
    defaultBg: "#2E86C1",
    defaultEyeLevel: 30
  },
  {
    id: "india",
    name: "India (35x45 mm)",
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
    description: "Standard Indian passport size.",
    defaultBg: "#FFFFFF",
    defaultEyeLevel: 30
  },
  {
    id: "custom",
    name: "Custom Size",
    widthMm: 35,
    heightMm: 45,
    widthPx: 413,
    heightPx: 531,
    description: "Define your own dimensions.",
    defaultBg: "transparent",
    defaultEyeLevel: 40
  },
];

export const backgroundColors = [
  { id: "white", name: "White", value: "#FFFFFF" },
  { id: "light_blue", name: "Light Blue", value: "#D6EAF8" },
  { id: "blue", name: "Blue", value: "#2E86C1" },
  { id: "grey", name: "Light Grey", value: "#E5E7E9" },
  { id: "red", name: "Red", value: "#E74C3C" },
  { id: "transparent", name: "Transparent", value: "transparent" },
];
