/**
 * Emoji icon mappings for menu categories and items.
 * Matching is keyword-based so it works for any item name.
 */

// ─── Category icons ───────────────────────────────────────────────────────────

const CATEGORY_ICONS: { keywords: string[]; icon: string }[] = [
  { keywords: ["starters"], icon: "🍟" },
  { keywords: ["momos"], icon: "🥟" },
  { keywords: ["veg wrap", "non veg wrap", "wrap"], icon: "🌯" },
  { keywords: ["veg burger", "non veg burger", "burger"], icon: "🍔" },
  { keywords: ["wings"], icon: "🍗" },
  { keywords: ["veg pizza", "non veg pizza", "pizza"], icon: "🍕" },
  { keywords: ["veg sandwich", "non veg sandwich", "sandwich"], icon: "🥪" },
  { keywords: ["pasta"], icon: "🍝" },
  { keywords: ["mojito"], icon: "🍹" },
  { keywords: ["milkshake", "shake"], icon: "🥤" },
  { keywords: ["broasted"], icon: "🍗" },
];

export function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const { keywords, icon } of CATEGORY_ICONS) {
    if (keywords.some((kw) => lower.includes(kw))) return icon;
  }
  return "🍽️";
}

// ─── Item icons ────────────────────────────────────────────────────────────────

const ITEM_ICONS: { keywords: string[]; icon: string }[] = [
  // Fries
  { keywords: ["peri peri fries"], icon: "🌶️" },
  { keywords: ["cheesy fries"], icon: "🧀" },
  { keywords: ["chicken loaded fries"], icon: "🍗" },
  { keywords: ["french fries", "fries"], icon: "🍟" },
  // Starters
  { keywords: ["nuggets"], icon: "🍗" },
  { keywords: ["broasted strips"], icon: "🔥" },
  { keywords: ["spicy strips"], icon: "🌶️" },
  { keywords: ["mayonnaise"], icon: "🫙" },
  // Momos
  { keywords: ["cheese burst momos"], icon: "🧀" },
  { keywords: ["tikka momos"], icon: "🔥" },
  { keywords: ["peri peri momos"], icon: "🌶️" },
  { keywords: ["manchurian momos"], icon: "🥢" },
  { keywords: ["garlic momos"], icon: "🧄" },
  { keywords: ["paneer garlic momos"], icon: "🧄" },
  { keywords: ["paneer peri peri momos"], icon: "🌶️" },
  { keywords: ["paneer momos"], icon: "🧀" },
  { keywords: ["chicken fried momos"], icon: "🍗" },
  { keywords: ["momos"], icon: "🥟" },
  // Wraps
  { keywords: ["butter chicken wrap"], icon: "🧈" },
  { keywords: ["zinger wrap"], icon: "⚡" },
  { keywords: ["kabab wrap"], icon: "🍢" },
  { keywords: ["afghani wrap"], icon: "🔥" },
  { keywords: ["peri peri wrap"], icon: "🌶️" },
  { keywords: ["chicken chilly wrap"], icon: "🌶️" },
  { keywords: ["spicy paneer wrap"], icon: "🌶️" },
  { keywords: ["paneer garlic wrap"], icon: "🧄" },
  { keywords: ["paneer chilli wrap"], icon: "🌶️" },
  { keywords: ["wrap"], icon: "🌯" },
  // Burgers
  { keywords: ["korean burger"], icon: "🌏" },
  { keywords: ["crust crispy burger"], icon: "🏆" },
  { keywords: ["peri peri zinger burger"], icon: "🌶️" },
  { keywords: ["afghani burger"], icon: "🔥" },
  { keywords: ["zinger burger"], icon: "⚡" },
  { keywords: ["kabab burger"], icon: "🍢" },
  { keywords: ["tandoori burger"], icon: "🔥" },
  { keywords: ["paneer chilly burger"], icon: "🌶️" },
  { keywords: ["aloo tikki burger"], icon: "🥔" },
  { keywords: ["burger"], icon: "🍔" },
  // Wings
  { keywords: ["bbq chicken", "bbq"], icon: "🔥" },
  { keywords: ["hot & spicy chicken", "hot&spicy"], icon: "🌶️" },
  { keywords: ["garlic chicken"], icon: "🧄" },
  { keywords: ["broasted wings"], icon: "🍗" },
  // Pasta
  { keywords: ["white sauce"], icon: "🍝" },
  { keywords: ["hot sauce chicken pasta"], icon: "🌶️" },
  { keywords: ["pasta"], icon: "🍝" },
  // Pizza
  { keywords: ["cheese burst pizza"], icon: "🧀" },
  { keywords: ["peri peri pizza"], icon: "🌶️" },
  { keywords: ["spicy paneer pizza"], icon: "🌶️" },
  { keywords: ["bbq chicken pizza"], icon: "🔥" },
  { keywords: ["butter chicken pizza"], icon: "🧈" },
  { keywords: ["chicken manchurian pizza"], icon: "🥢" },
  { keywords: ["pizza"], icon: "🍕" },
  // Sandwiches
  { keywords: ["tikka cheese sandwich"], icon: "🔥" },
  { keywords: ["chicken dynamite sandwich"], icon: "⚡" },
  { keywords: ["jumbo sandwich"], icon: "🥪" },
  { keywords: ["paneer pizza sandwich"], icon: "🍕" },
  { keywords: ["veg club sandwich"], icon: "🥗" },
  { keywords: ["sandwich"], icon: "🥪" },
  // Mojitos
  { keywords: ["virgin mojito"], icon: "🍃" },
  { keywords: ["passion fruit"], icon: "🍹" },
  { keywords: ["black currant"], icon: "🫐" },
  { keywords: ["kiwi"], icon: "🥝" },
  { keywords: ["strawberry"], icon: "🍓" },
  { keywords: ["green apple"], icon: "🍏" },
  { keywords: ["blue mint"], icon: "🍃" },
  { keywords: ["watermelon"], icon: "🍉" },
  // Milkshakes
  { keywords: ["cold coffee"], icon: "☕" },
  { keywords: ["dark fantasy"], icon: "🍪" },
  { keywords: ["kitkat"], icon: "🍫" },
  { keywords: ["sitafal"], icon: "🥛" },
  { keywords: ["tender shake"], icon: "🥤" },
  { keywords: ["shake"], icon: "🥤" },
  // Broasted
  { keywords: ["full bucket"], icon: "🪣" },
  { keywords: ["half bucket"], icon: "🪣" },
  { keywords: ["broasted chicken per piece"], icon: "🍗" },
  // Fallback
  { keywords: ["paneer"], icon: "🧀" },
  { keywords: ["chicken"], icon: "🍗" },
  { keywords: ["veg"], icon: "🥗" },
];

export function getItemIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const { keywords, icon } of ITEM_ICONS) {
    if (keywords.some((kw) => lower.includes(kw))) return icon;
  }
  return "🍽️";
}
