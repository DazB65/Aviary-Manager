export const GENDER_LABELS: Record<string, string> = { male: "♂ Male", female: "♀ Female", unknown: "? Unknown" };

export const STATUS_COLORS: Record<string, string> = {
  alive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  breeding: "bg-pink-50 text-pink-700 border-pink-200",
  resting: "bg-amber-50 text-amber-700 border-amber-200",
  deceased: "bg-gray-50 text-gray-500 border-gray-200",
  sold: "bg-blue-50 text-blue-700 border-blue-200",
  unknown: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

export const STATUS_LABELS: Record<string, string> = {
  alive: "Alive",
  breeding: "🥚 Breeding",
  resting: "💤 Resting",
  deceased: "Deceased",
  sold: "Sold",
  unknown: "Unknown",
};
