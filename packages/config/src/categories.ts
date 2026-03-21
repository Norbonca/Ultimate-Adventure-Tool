export const ADVENTURE_CATEGORIES = {
  hiking: { label: "Túrázás", icon: "🥾", color: "#4CAF50" },
  mountain: { label: "Hegymászás", icon: "🏔️", color: "#795548" },
  water: { label: "Vízi sportok", icon: "🚣", color: "#039BE5" },
  motorsport: { label: "Motorsport", icon: "🏍️", color: "#F44336" },
  cycling: { label: "Kerékpározás", icon: "🚴", color: "#FF9800" },
  running: { label: "Futás", icon: "🏃", color: "#9C27B0" },
  winter: { label: "Téli sportok", icon: "⛷️", color: "#00BCD4" },
  expedition: { label: "Expedíció", icon: "🧭", color: "#FF6F00" },
} as const;

export type AdventureCategory = keyof typeof ADVENTURE_CATEGORIES;
