export const MANDALS = {
  "VD-1": ["Atladara", "Niramay", "Narayanwadi", "Pramukhswaminagar", "Racecourse", "Samta", "Vadsar"],
  "VD-2": ["Danteshwar", "Indrapuri", "Makarpura", "Maneja", "Manjalpur", "Shiyabaug", "Tarsali", "Wadi"],
  "VD-3": ["Chhani Gam", "Chhani Jakatnaka", "Gorwa", "Gotri", "Karelibaug", "Sama", "Sardarnagar"],
} as const;

export type Sector = keyof typeof MANDALS;
export const EVENT_ID = "seva-yagna-2026";

export function mandalId(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Registered Yuvak targets taken from the official summary sheet (last column "Total Reg.").
 * Total: 557 Yuvaks across 22 Mandals (VD-1: 187, VD-2: 199, VD-3: 171).
 */
export const REGISTERED_TARGETS: Record<string, number> = {
  // VD-1 (Total: 187)
  "atladara": 42,
  "niramay": 13,
  "narayanwadi": 24,
  "pramukhswaminagar": 25,
  "racecourse": 40,
  "samta": 18,
  "vadsar": 25,

  // VD-2 (Total: 199)
  "danteshwar": 15,
  "indrapuri": 43,
  "makarpura": 14,
  "maneja": 22,
  "manjalpur": 44,
  "shiyabaug": 17,
  "tarsali": 22,
  "wadi": 22,

  // VD-3 (Total: 171)
  "chhani-gam": 28,
  "chhani-jakatnaka": 30,
  "gorwa": 29,
  "gotri": 15,
  "karelibaug": 36,
  "sama": 20,
  "sardarnagar": 13,
};

export function getRegisteredCount(id: string): number {
  return REGISTERED_TARGETS[id] ?? 0;
}

