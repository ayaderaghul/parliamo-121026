import { defineConfig } from "vitest/config";

// The API test files share one test database and rebuild it, so they run one
// file at a time.
export default defineConfig({ test: { fileParallelism: false } });
