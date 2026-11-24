// Entry program for the make.fun "promote the make-your-own-bounty post" bounty.
//
// Reads POST.json from the bot directory, verifies that it names a single
// X / Twitter status post, and copies the file's exact bytes into the
// output directory so the grader can read the same post address back.
// Deterministic: no network, no clock, no randomness, builtins only.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ALLOWED_HOSTS = new Set(["x.com", "twitter.com"]);

// A canonical status address: /<handle>/status/<numeric id>, nothing else.
const STATUS_PATH = /^\/([A-Za-z0-9_]+)\/status\/(\d+)$/;

function fail(message: string): never {
  throw new Error(`POST.json: ${message}`);
}

function readEntryBytes(botDir: string): Buffer {
  try {
    return readFileSync(join(botDir, "POST.json"));
  } catch {
    return fail("could not be read from the bot directory");
  }
}

function extractUrl(bytes: Buffer): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    return fail("is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return fail("must be a JSON object with a \"url\" field");
  }
  const url = (parsed as Record<string, unknown>).url;
  if (typeof url !== "string" || url.length === 0) {
    return fail("\"url\" must be a non-empty string");
  }
  return url;
}

function checkStatusUrl(raw: string): void {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail(`"url" is not a parseable URL: ${raw}`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return fail(`"url" must use http or https, got ${url.protocol}`);
  }
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    return fail(`"url" host must be x.com or twitter.com, got ${url.hostname}`);
  }
  if (url.search !== "" || url.hash !== "" || !STATUS_PATH.test(url.pathname)) {
    return fail(
      `"url" path must look like /<handle>/status/<id>, got ${url.pathname}`,
    );
  }
}

function main(): void {
  const botDir = process.env.MAKEFUN_BOT_DIR ?? ".";
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";

  const bytes = readEntryBytes(botDir);
  checkStatusUrl(extractUrl(bytes));

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, "POST.json"), bytes);
}

main();
