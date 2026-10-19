#!/usr/bin/env node
// Verb script: journal a campaign's current readiness (blocked/ready and
// why), loaded from a JSON file on disk. Imports src and scripts only.

import { campaignReadinessScore } from "../src/crowdfunding.mjs";
import { recordJournal } from "../src/journal.mjs";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-operation-engineering-services-section/operation";

/**
 * @param {import("../src/crowdfunding.mjs").CampaignSpec} campaign
 * @param {{root:string, now?:()=>string}} opts
 */
export function recordCampaignReadiness(campaign, { root, now = () => new Date().toISOString() }) {
  const readiness = campaignReadinessScore(campaign);
  const recordedAt = now();
  const record = { campaignId: campaign.id, status: readiness.status, blockers: readiness.blockers, assessedAt: recordedAt };
  recordJournal(root, "campaign-readiness", recordedAt, record);
  return record;
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "campaign-readiness", description: "recordCampaignReadiness — the campaign-readiness operation.", inputSchema: { type: "object", required: ["campaign", "root"], properties: { campaign: { type: "object" }, root: { type: "string", minLength: 1 }, recordedAt: { type: "string", minLength: 1 } }, additionalProperties: false }, operation: ({ campaign, root, recordedAt }) => recordCampaignReadiness(campaign, { root, ...(recordedAt === undefined ? {} : { now: () => recordedAt }) }) }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
