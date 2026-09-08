/** Fetch JSON from a trusted application asset; does not validate its schema. */
export async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}
