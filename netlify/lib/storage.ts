import { getStore } from "@netlify/blobs";

const SESSION_TTL_MS = 10 * 60 * 1000;
const DEV_USER_KEY = "dev";

export interface OAuthSession {
  verifier: string;
  createdAt: number;
}

export async function putSession(state: string, verifier: string): Promise<void> {
  const store = getStore("oauth-sessions");
  await store.setJSON(state, { verifier, createdAt: Date.now() } satisfies OAuthSession);
}

export async function takeSession(state: string): Promise<OAuthSession | null> {
  const store = getStore("oauth-sessions");
  const session = (await store.get(state, { type: "json" })) as OAuthSession | null;
  if (!session) return null;
  await store.delete(state);
  if (Date.now() - session.createdAt > SESSION_TTL_MS) return null;
  return session;
}

export interface AccessTokenRecord {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  acquired_at: number;
}

export async function putToken(record: AccessTokenRecord): Promise<void> {
  const store = getStore("mcp-tokens");
  await store.setJSON(DEV_USER_KEY, record);
}

export async function getToken(): Promise<AccessTokenRecord | null> {
  const store = getStore("mcp-tokens");
  return (await store.get(DEV_USER_KEY, { type: "json" })) as AccessTokenRecord | null;
}

interface MockSession {
  challenge: string;
  redirect_uri: string;
  client_id: string;
  createdAt: number;
}

export async function putMockSession(
  code: string,
  session: { challenge: string; redirect_uri: string; client_id: string },
): Promise<void> {
  const store = getStore("mock-oauth");
  await store.setJSON(code, { ...session, createdAt: Date.now() } satisfies MockSession);
}

export async function takeMockSession(code: string): Promise<MockSession | null> {
  const store = getStore("mock-oauth");
  const s = (await store.get(code, { type: "json" })) as MockSession | null;
  if (!s) return null;
  await store.delete(code);
  if (Date.now() - s.createdAt > SESSION_TTL_MS) return null;
  return s;
}
