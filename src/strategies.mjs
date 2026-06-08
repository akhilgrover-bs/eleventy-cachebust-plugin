import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Hash strategy — appends a content-based fingerprint derived from the
 * file on disk.  Falls back to build-time if the file cannot be read
 * (e.g. remote CDN URLs that have no local counterpart).
 *
 * @param {string} filePath  Absolute path to the asset on disk
 * @param {"md5"|"sha1"|"sha256"} algorithm
 * @returns {string} hex fingerprint (8 chars)
 */
export function hashStrategy(filePath, algorithm = "md5") {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash(algorithm).update(content).digest("hex").slice(0, 8);
  } catch {
    return buildTimeStrategy();
  }
}

/**
 * Build-time strategy — returns a fixed token generated once per build.
 * The token is the unix timestamp (seconds) at the moment this module is
 * first imported, which equals the Eleventy build start time.
 */
export const BUILD_TOKEN = String(Math.floor(Date.now() / 1000));

export function buildTimeStrategy() {
  return BUILD_TOKEN;
}
