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
