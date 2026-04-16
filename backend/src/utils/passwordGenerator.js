/**
 * Generate simple, memorable passwords for KIAL staff.
 * Format: adjective-noun-3digits (e.g., "brave-tiger-482")
 */

const adjectives = [
  "brave", "cool", "fast", "keen", "bold",
  "calm", "fair", "glad", "wise", "kind",
  "safe", "true", "warm", "deep", "sure",
  "blue", "gold", "iron", "star", "swift",
  "clear", "prime", "sharp", "noble", "grand",
  "light", "pure", "real", "good", "high",
];

const nouns = [
  "tiger", "eagle", "hawk", "lion", "bear",
  "wolf", "deer", "dove", "fox", "owl",
  "peak", "lake", "star", "moon", "wind",
  "rock", "pine", "oak", "sky", "sun",
  "jade", "ruby", "ace", "key", "gem",
  "wing", "reef", "cove", "bay", "dale",
];

/**
 * Generate a simple, memorable password.
 * @returns {string} e.g. "brave-tiger-482"
 */
function generatePassword() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = String(Math.floor(100 + Math.random() * 900)); // 3-digit number (100-999)
  return `${adj}-${noun}-${num}`;
}

module.exports = { generatePassword };
