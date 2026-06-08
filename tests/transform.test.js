"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { rewriteUrl, transformHtml } = require("../src/transform");
const { resolveExtensions } = require("../src/asset-types");
const { BUILD_TOKEN } = require("../src/strategies");

// ── Helpers ──────────────────────────────────────────────────────────────────

function allExts() {
  return resolveExtensions("all");
}

function jsOnly() {
  return resolveExtensions("js");
}

// Build-time options (no disk reads required)
const btOptions = { strategy: "buildtime", hashAlgorithm: "md5", processCdnUrls: false };

// ── rewriteUrl ────────────────────────────────────────────────────────────────

describe("rewriteUrl — buildtime strategy", () => {
  const exts = allExts();
  const dir  = "/tmp/site";

  it("appends ?v=<token> to a root-relative JS URL", () => {
    const out = rewriteUrl("/assets/app.js", exts, btOptions, dir);
    assert.equal(out, `/assets/app.js?v=${BUILD_TOKEN}`);
  });

  it("appends &v=<token> when a query string already exists", () => {
    const out = rewriteUrl("/assets/app.js?foo=bar", exts, btOptions, dir);
    assert.equal(out, `/assets/app.js?foo=bar&v=${BUILD_TOKEN}`);
  });

  it("does not double-bust a URL that already has ?v=", () => {
    const url = `/assets/app.js?v=${BUILD_TOKEN}`;
    assert.equal(rewriteUrl(url, exts, btOptions, dir), url);
  });

  it("skips data: URIs", () => {
    const url = "data:image/png;base64,abc==";
    assert.equal(rewriteUrl(url, exts, btOptions, dir), url);
  });

  it("skips anchor-only hrefs", () => {
    assert.equal(rewriteUrl("#section", exts, btOptions, dir), "#section");
  });

  it("skips extensions not in the allowed set", () => {
    const url = "/page.html";
    assert.equal(rewriteUrl(url, jsOnly(), btOptions, dir), url);
  });

  it("skips absolute (CDN) URLs when processCdnUrls is false", () => {
    const url = "https://cdn.example.com/app.js";
    assert.equal(rewriteUrl(url, exts, btOptions, dir), url);
  });

  it("rewrites absolute URLs when processCdnUrls is true", () => {
    const opts = { ...btOptions, processCdnUrls: true };
    const out = rewriteUrl("https://cdn.example.com/app.js", exts, opts, dir);
    assert.ok(out.includes(`?v=${BUILD_TOKEN}`), `expected token in: ${out}`);
  });
});

// ── transformHtml ─────────────────────────────────────────────────────────────

describe("transformHtml — buildtime strategy", () => {
  const exts = allExts();
  const dir  = "/tmp/site";

  it("rewrites <script src>", () => {
    const html = `<script src="/assets/app.js"></script>`;
    const out  = transformHtml(html, exts, btOptions, dir);
    assert.ok(out.includes(`src="/assets/app.js?v=${BUILD_TOKEN}"`), out);
  });

  it("rewrites <link href> for CSS", () => {
    const html = `<link rel="stylesheet" href="/assets/style.css">`;
    const out  = transformHtml(html, exts, btOptions, dir);
    assert.ok(out.includes(`href="/assets/style.css?v=${BUILD_TOKEN}"`), out);
  });

  it("rewrites <img src>", () => {
    const html = `<img src="/images/logo.png" alt="logo">`;
    const out  = transformHtml(html, exts, btOptions, dir);
    assert.ok(out.includes(`src="/images/logo.png?v=${BUILD_TOKEN}"`), out);
  });

  it("rewrites srcset descriptors", () => {
    const html = `<img srcset="/img/sm.png 480w, /img/lg.png 1080w">`;
    const out  = transformHtml(html, exts, btOptions, dir);
    assert.ok(out.includes(`/img/sm.png?v=${BUILD_TOKEN} 480w`), out);
    assert.ok(out.includes(`/img/lg.png?v=${BUILD_TOKEN} 1080w`), out);
  });

  it("does not rewrite <a href> pointing to an HTML page", () => {
    const html = `<a href="/about.html">About</a>`;
    const out  = transformHtml(html, jsOnly(), btOptions, dir);
    assert.ok(out.includes('href="/about.html"'), out);
  });

  it("does not rewrite assets outside the allowed extension set", () => {
    const html = `<script src="/assets/app.js"></script><link href="/style.css">`;
    const out  = transformHtml(html, jsOnly(), btOptions, dir);
    assert.ok(out.includes(`src="/assets/app.js?v=`), "js should be rewritten");
    assert.ok(out.includes('href="/style.css"'), "css should NOT be rewritten");
  });

  it("handles double-quoted and single-quoted attributes", () => {
    const html = `<script src='/assets/app.js'></script>`;
    const out  = transformHtml(html, exts, btOptions, dir);
    assert.ok(out.includes(`src='/assets/app.js?v=${BUILD_TOKEN}'`), out);
  });

  it("rewrites data-src (lazy-load pattern)", () => {
    const html = `<img data-src="/images/photo.jpg">`;
    const out  = transformHtml(html, exts, btOptions, dir);
    assert.ok(out.includes(`data-src="/images/photo.jpg?v=${BUILD_TOKEN}"`), out);
  });
});

// ── hash strategy via transform ───────────────────────────────────────────────

describe("transformHtml — hash strategy with real file", () => {
  let tmpDir;
  let outputDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cachebust-html-test-"));
    outputDir = tmpDir;
    const assetsDir = path.join(tmpDir, "assets");
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, "app.js"), "console.log('v1');");
  });

  it("appends a hash-based token that is NOT the build timestamp", () => {
    const opts = { strategy: "hash", hashAlgorithm: "md5", processCdnUrls: false };
    const html = `<script src="/assets/app.js"></script>`;
    const out  = transformHtml(html, allExts(), opts, outputDir);
    // Token should be present
    assert.ok(out.includes("?v="), out);
    // Token should be 8 hex chars
    const match = out.match(/\?v=([0-9a-f]{8})/);
    assert.ok(match, `expected 8-char hex token in: ${out}`);
    // Should NOT equal the build timestamp
    assert.notEqual(match[1], BUILD_TOKEN);
  });
});
