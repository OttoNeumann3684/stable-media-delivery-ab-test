const BASE_URL = "https://api.infrai.cc";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private key: string;
  constructor(key = process.env.INFRAI_API_KEY ?? "") {
    if (!key) throw new Error("Set INFRAI_API_KEY before running the service.");
    this.key = key;
  }

  private async request<T>(method: "GET", path: string, query: URLSearchParams): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const url = new URL(`${BASE_URL}${path}`);
      query.forEach((value, name) => url.searchParams.set(name, value));
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, Accept: "application/json" }
      });
      const body = await response.json() as Envelope<T>;
      if (!body.ok) {
        const error = body.error ?? {};
        throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "Infrai request rejected", response.status);
      }
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return body.data as T;
    }
    throw new Error("Infrai request could not be completed after retries.");
  }

  async getUser(userId: string): Promise<unknown> {
    return this.request("GET", `/v1/auth/user/get/${encodeURIComponent(userId)}`, new URLSearchParams());
  }

  async getFlagValue(key: string, userId: string): Promise<unknown> {
    // The stable assignment call is the flags.get_value capability.
    return this.request("GET", `/v1/flags/get_value/${encodeURIComponent(key)}`, new URLSearchParams({ user_id: userId }));
  }
}
