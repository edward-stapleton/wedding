export function normalizeEmailForStorage(email) {
  return email?.trim().toLowerCase() || '';
}

export function formatGuestName(firstName, lastName, fallback) {
  const trimmedFirst = firstName?.trim() || '';
  const trimmedLast = lastName?.trim() || '';
  if (trimmedFirst || trimmedLast) {
    return `${trimmedFirst} ${trimmedLast}`.trim();
  }
  return fallback;
}

export function setInputValueIfEmpty(input, value) {
  if (!input) return;
  if (!input.value && value) {
    input.value = value;
  }
}

export function setInputValue(input, value) {
  if (!input) return;
  input.value = value ?? '';
}
