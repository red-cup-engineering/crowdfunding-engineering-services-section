import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { journalRecords } from "../src/journal.mjs";

const campaign = { id: "cli-fixture", title: "Fixture", category: "Design", blurb: "Synthetic fixture", dayRateUsd: 100, deadlineDays: 30, tasks: [{ name: "Build", description: "Build fixture", lowDays: 2, highDays: 3, sourcePath: "fixture" }], groundedIn: ["fixture"], blockers: ["fixture blocker"] };
function cli(script, request) {
  return spawnSync(process.execPath, [fileURLToPath(new URL(`../scripts/${script}.mjs`, import.meta.url))], {
    input: JSON.stringify(request) + "\n", encoding: "utf8", env: {}, timeout: 10000,
  });
}
function result(run) {
  assert.equal(run.status, 0, run.stderr || run.stdout);
  return JSON.parse(run.stdout);
}
test("file-based goal and validation commands retain their JSON string request", t => {
  const root = mkdtempSync(join(tmpdir(), "crowdfunding-cli-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const path = join(root, "campaign.json");
  writeFileSync(path, JSON.stringify(campaign));
  assert.equal(result(cli("compute-goal", path)).recommendedGoalUsd, 200);
  assert.equal(result(cli("validate-campaign", path)).campaign.id, campaign.id);
});
test("page command binds both campaign and tiers from one request", () => {
  const page = result(cli("render-campaign-page", { campaign, tiers: [] }));
  assert.match(page, /# Fixture/);
  assert.match(page, /fixture blocker/);
});
test("readiness command binds explicit root and supplied observation time", t => {
  const root = mkdtempSync(join(tmpdir(), "crowdfunding-cli-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const recordedAt = "2026-10-19T12:00:00Z";
  const record = result(cli("campaign-readiness", { campaign, root, recordedAt }));
  assert.equal(record.assessedAt, recordedAt);
  assert.equal(record.status, "blocked");
  assert.equal(journalRecords(root, "campaign-readiness")[0].campaignId, campaign.id);
});
test("readiness refuses a missing campaign before writing to its root", t => {
  const parent = mkdtempSync(join(tmpdir(), "crowdfunding-cli-"));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const root = join(parent, "must-not-exist");
  const run = cli("campaign-readiness", { root });
  assert.equal(run.status, 2);
  assert.equal(JSON.parse(run.stdout).refusal.reason, "InvalidInput");
  assert.equal(existsSync(root), false);
});
test("page command refuses an omitted reward ladder", () => {
  const run = cli("render-campaign-page", { campaign });
  assert.equal(run.status, 2);
  assert.equal(JSON.parse(run.stdout).refusal.reason, "InvalidInput");
});
