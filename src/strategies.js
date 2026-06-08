"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

/**
 * Hash strategy — appends a content-based fingerprint derived from the
 * file on disk.  Falls back to build-time if the file cannot be read
 * (e.g. remote CDN URLs that have no local counterpart).
 *
 * @param {string} filePath  Absolute path to the asset on disk
 * @param {"md5"|"sha1"|"sha256"} algorithm
 * @returns {string} hex fingerprint (8 chars)
 */
function hashStrategy(filePath, algorithm = "md5") {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash(algorithm).update(content).digest("hex").slice(0, 8);
  } catch {
    // File not found — fall back to a short build-time token so the
    // build still succeeds.
    return buildTimeStrategy();
  }
}

/**
 * Build-time strategy — returns a fixed token generated once per build.
 * All assets share the same token so a single cache invalidation suffix
 * can be applied consistently.
 *
 * The token is the unix timestamp (seconds) at the moment this module is
 * first required, which equals the Eleventy build start time.
 */
const BUILD_TOKEN = String(Math.floor(Date.now() / 1000));

function buildTimeStrategy() {
  return BUILD_TOKEN;
}

module.exports = { hashStrategy, buildTimeStrategy, BUILD_TOKEN };
