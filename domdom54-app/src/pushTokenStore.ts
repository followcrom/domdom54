/**
 * Push token store.
 *
 * Replaces the previous Firebase Realtime Database dependency. Tokens are
 * POSTed to a Google Apps Script web app, which appends them to a private
 * Google Sheet and emails an alert whenever a new user enables notifications.
 *
 * The endpoint URL comes from EXPO_PUBLIC_TOKEN_ENDPOINT at build time.
 * EXPO_PUBLIC_* values are inlined into the JS bundle, so this URL is NOT a
 * secret — keeping it out of the repo is tidiness, not security. The real
 * protection is that the Apps Script validates every request server-side.
 */

import Constants from "expo-constants";
import * as Device from "expo-device";

const ENDPOINT = process.env.EXPO_PUBLIC_TOKEN_ENDPOINT ?? "";
const TIMEOUT_MS = 10000;

/**
 * Region from the device locale, e.g. "en-US" -> "US".
 * Parsed by hand rather than via `Intl.Locale` — that constructor isn't
 * reliably implemented in Hermes and throws silently on some devices.
 */
function getCountry(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return /-([A-Z]{2})(?:-|$)/.exec(locale)?.[1] ?? "";
  } catch {
    return "";
  }
}

export type TokenAction = "save" | "remove";

export type TokenResult =
  | { ok: true; status: "created" | "exists" | "removed" | "absent" }
  | { ok: false; error: string };

async function post(action: TokenAction, token: string): Promise<TokenResult> {
  if (!ENDPOINT) {
    // Not a hard failure: the app still works, we just don't record the token.
    console.warn(`[pushTokenStore] EXPO_PUBLIC_TOKEN_ENDPOINT is unset, skipping "${action}"`);
    return { ok: false, error: "endpoint-not-configured" };
  }
  if (!token) {
    return { ok: false, error: "empty-token" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      // text/plain avoids a CORS preflight and still populates
      // e.postData.contents on the Apps Script side.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action,
        token,
        appVersion: Constants.expoConfig?.version ?? "",
        osVersion: Device.osVersion ?? "",
        country: getCountry(),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, error: `http-${res.status}` };
    }

    const data = (await res.json()) as TokenResult;
    return data;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? "timeout"
          : error.message
        : "unknown-error";
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/** Record a push token. Safe to call repeatedly — the endpoint de-duplicates. */
export function saveToken(expoPushToken: string): Promise<TokenResult> {
  return post("save", expoPushToken);
}

/** Remove a push token, e.g. when the user disables notifications. */
export function deleteToken(expoPushToken: string): Promise<TokenResult> {
  return post("remove", expoPushToken);
}
