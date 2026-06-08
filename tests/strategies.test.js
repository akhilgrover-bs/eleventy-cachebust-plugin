"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { hashStrategy, buildTimeStrategy, BUILD_TOKEN } = require("../src/strategies");

describe("buildTimeStrategy", () => {
  it("returns a non-empty string", () => {
    const token = buildTimeStrategy();
    assert.equal(typeof token, "string");
    assert.ok(token.length > 0);
  });

  it("returns the same token on repeated calls (stable within a build)", () => {
    assert.equal(buildTimeStrategy(), BUILD_TOKEN);
    assert.equal(buildTimeStrategy(), BUILD_TOKEN);
  });

  it("looks like a unix timestamp (all digits)", () => {
    assert.match(BUILD_TOKEN, /^\d+$/);
  });
});

describe("hashStrategy", () => {
  let tmpFile;
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cachebust-test-"));
    tmpFile = path.join(tmpDir, "asset.js");
    fs.writeFileSync(tmpFile, "console.log('hello');");
  });

  it("returns an 8-character hex string for a readable file", () => {
    const token = hashStrategy(tmpFile);
    assert.match(token, /^[0-9a-f]{8}$/);
  });

  it("is deterministic — same file yields same token", () => {
    assert.equal(hashStrategy(tmpFile), hashStrategy(tmpFile));
  });

  it("changes when file content changes", () => {
    const original = hashStrategy(tmpFile);
    fs.writeFileSync(tmpFile, "console.log('world');");
    const updated = hashStrategy(tmpFile);
    assert.notEqual(original, updated);
  });

  it("falls back to build-time token for missing file", () => {
    const token = hashStrategy("/nonexistent/path/file.js");
    assert.equal(token, BUILD_TOKEN);
  });

  it("respects the algorithm option (sha256 produces different result to md5)", () => {
    const md5  = hashStrategy(tmpFile, "md5");
    const sha  = hashStrategy(tmpFile, "sha256");
    // Both are 8-char hex but will differ in value
    assert.match(md5,  /^[0-9a-f]{8}$/);
    assert.match(sha,  /^[0-9a-f]{8}$/);
    assert.notEqual(md5, sha);
  });
});
