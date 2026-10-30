/**
 * Format a date string to a human-readable format
 */
export function formatDate(dateString, options = {}) {
  const defaults = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', { ...defaults, ...options });
}

/**
 * Format seconds into MM:SS
 */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format duration in minutes to "X min" or "X hr Y min"
 */
export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

/**
 * Get a score grade label
 */
export function getScoreGrade(score) {
  if (score >= 90) return { label: 'Excellent', color: 'var(--success-500)' };
  if (score >= 80) return { label: 'Good',      color: 'var(--blue-500)' };
  if (score >= 70) return { label: 'Fair',       color: 'var(--warning-500)' };
  return           { label: 'Needs Work',        color: 'var(--error-500)' };
}

/**
 * Get initials from a name
 */
export function getInitials(name = '') {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Clamp a number between min and max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Truncate text to a given length
 */
export function truncate(text = '', maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Deep merge two objects
 */
export function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] });
        else output[key] = deepMerge(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Delay – promise-based sleep
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
