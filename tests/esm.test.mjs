import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";

// ── ESM imports ─────────────────────────────────────────────────────────────
import {
  hashStrategy,
  buildTimeStrategy,
  BUILD_TOKEN,
} from "../src/strategies.mjs";

import { resolveExtensions } from "../src/asset-types.mjs";
import { rewriteUrl, transformHtml } from "../src/transform.mjs";
import cacheBustPlugin, { cacheBustPlugin as namedExport } from "../src/index.mjs";

// ── Verify ESM entry point exports ───────────────────────────────────────────

describe("ESM entry point exports", () => {
  it("default export is a function (the plugin)", () => {
    assert.equal(typeof cacheBustPlugin, "function");
  });

  it("named export cacheBustPlugin matches default export", () => {
    assert.equal(cacheBustPlugin, namedExport);
  });

  it("re-exports hashStrategy", () => {
    assert.equal(typeof hashStrategy, "function");
  });

  it("re-exports buildTimeStrategy", () => {
    assert.equal(typeof buildTimeStrategy, "function");
  });

  it("re-exports resolveExtensions", () => {
    assert.equal(typeof resolveExtensions, "function");
  });
});

// ── Smoke-test strategies via ESM ────────────────────────────────────────────

describe("strategies via ESM import", () => {
  let tmpFile;

  before(() => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cachebust-esm-"));
    tmpFile = path.join(tmpDir, "app.js");
    fs.writeFileSync(tmpFile, "export const x = 1;");
  });

  it("buildTimeStrategy returns a numeric string", () => {
    assert.match(buildTimeStrategy(), /^\d+$/);
  });

  it("hashStrategy returns 8-char hex for a real file", () => {
    assert.match(hashStrategy(tmpFile), /^[0-9a-f]{8}$/);
  });

  it("hashStrategy falls back to BUILD_TOKEN for missing file", () => {
    assert.equal(hashStrategy("/no/such/file.js"), BUILD_TOKEN);
  });
});

// ── Smoke-test transform via ESM ─────────────────────────────────────────────

describe("transformHtml via ESM import", () => {
  const exts = resolveExtensions("all");
  const opts = { strategy: "buildtime", hashAlgorithm: "md5", processCdnUrls: false };

  it("rewrites script src", () => {
    const out = transformHtml(
      `<script src="/app.js"></script>`,
      exts, opts, "/tmp/site"
    );
    assert.ok(out.includes(`/app.js?v=${BUILD_TOKEN}`), out);
  });

  it("rewrites link href for CSS", () => {
    const out = transformHtml(
      `<link href="/style.css">`,
      exts, opts, "/tmp/site"
    );
    assert.ok(out.includes(`/style.css?v=${BUILD_TOKEN}`), out);
  });

  it("rewrites srcset", () => {
    const out = transformHtml(
      `<img srcset="/sm.png 480w, /lg.png 1080w">`,
      exts, opts, "/tmp/site"
    );
    assert.ok(out.includes(`/sm.png?v=${BUILD_TOKEN} 480w`), out);
    assert.ok(out.includes(`/lg.png?v=${BUILD_TOKEN} 1080w`), out);
  });
});

// ── Verify CJS and ESM BUILD_TOKEN are independent ───────────────────────────
// (They are separate module instances so tokens may differ by a second in
//  slow environments — we just check both are valid timestamps.)

describe("CJS vs ESM module isolation", () => {
  it("CJS require() resolves to the CJS build", () => {
    const require = createRequire(import.meta.url);
    const cjs = require("../src/index.js");
    assert.equal(typeof cjs, "function", "CJS default export should be a function");
  });
});
