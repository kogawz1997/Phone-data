export type JsonValue = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export class ProviderHttpError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ProviderHttpError";
    this.status = status;
    this.body = body;
  }
}

export async function readJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function providerFetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await readJsonSafe(response);
  if (!response.ok) {
    throw new ProviderHttpError(`Provider request failed: ${response.status}`, response.status, body);
  }
  return body as T;
}
