# Changelog

## 0.1.2
- **Batch runner hardened for large audits** (the full-registry census exposed this):
  - Live progress counter (`scanned N/total`) — no more looking hung.
  - **Incremental writes**: with `--out`, a partial report is flushed every 100 servers, so an
    interrupted run keeps its results instead of losing everything.
  - HTTP request timeout lowered to 8s so unresponsive servers fail fast (big censuses were
    taking ~25 min and getting killed before writing).
  - `unhandledRejection` / `uncaughtException` handlers so one bad response can't silently kill a run.

## 0.1.1
- Publish under scoped name `@andreolf/mcpaudit`; CLI usage text fixed.

## 0.1.0
- Initial release: http/stdio/npm transports, A–F grading, batch runner, official-registry fetcher.
