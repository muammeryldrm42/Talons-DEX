const DEFAULT_TIMEOUT_MS = 10_000;
const RETRIES = 2;

export async function fetchWithRetry<T>(url: string, init?: RequestInit): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Request failed with status ${res.status}`);
      }

      return (await res.json()) as T;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt === RETRIES) break;
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "Unknown network error while contacting Jupiter";
  throw new Error(`Unable to complete request. ${message}`);
}
