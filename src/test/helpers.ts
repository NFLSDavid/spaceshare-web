import { NextRequest } from "next/server";

export function createRequest(
  url: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): NextRequest {
  const { method = "GET", body, headers = {} } = options;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

export async function parseResponse(response: Response) {
  const status = response.status;
  const body = await response.json();
  return { status, body };
}
