#!/usr/bin/env node
/**
 * Prune dead Prisma runtimes after `prisma generate`.
 *
 * The store runs PostgreSQL only through @prisma/adapter-pg with the
 * library-engine client, so the wasm runtimes of every other database and
 * the compiler runtimes are never loaded at runtime. Next's node-file-trace
 * still copies whatever exists on disk into each Vercel Function bundle, so
 * deleting the dead files keeps ~35MB of Functions Storage per deployment
 * from being billed.
 *
 * IMPORTANT: this list must never include the native query engine
 * (`libquery_engine-*.so.node`, required at runtime by the standard
 * prisma-client-js output) nor prisma CLI's schema engine. A previous
 * version pruned the .so and broke every Prisma call — keep it that way.
 */
import { unlink, access } from "node:fs/promises";
import nodePath from "node:path";

const WASM_FAMILIES = ["cockroachdb", "mysql", "sqlite", "sqlserver"];
const candidates = [];
for (const family of WASM_FAMILIES) {
  candidates.push(
    `node_modules/@prisma/client/runtime/query_engine_bg.${family}.wasm-base64.js`,
    `node_modules/@prisma/client/runtime/query_engine_bg.${family}.wasm-base64.mjs`,
    `node_modules/@prisma/client/runtime/query_compiler_bg.${family}.wasm-base64.js`,
    `node_modules/@prisma/client/runtime/query_compiler_bg.${family}.wasm-base64.mjs`
  );
}
// The compiler runtimes (queryCompiler preview) are unused too: the active
// runtime is library.js + query_engine_bg.js (the pg driver adapter routes
// through the .so engine, not wasm).
candidates.push(
  "node_modules/@prisma/client/runtime/query_compiler_bg.postgresql.wasm-base64.js",
  "node_modules/@prisma/client/runtime/query_compiler_bg.postgresql.wasm-base64.mjs"
);

let removed = 0;
for (const candidate of candidates) {
  const full = nodePath.resolve(candidate);
  try {
    await access(full);
    await unlink(full);
    removed += 1;
  } catch {
    // Already absent: nothing to prune.
  }
}
console.log(`[prune-prisma-runtime] removed ${removed} dead runtime files`);
