#!/usr/bin/env node
// SpeedyIndex MCP server: Google/Bing/Yandex index checks, link indexing and Google Rank Tracker for AI assistants.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SpeedyIndex } from "speedyindex";

const VERSION = "0.1.0";
let client;
function si() {
  if (!client) client = new SpeedyIndex({ apiKey: process.env.SPEEDYINDEX_API_KEY });
  return client;
}

const ok = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
const fail = (e) => ({ isError: true, content: [{ type: "text", text: `SpeedyIndex error: ${e.message}` }] });
const wrap = (fn) => async (args) => { try { return ok(await fn(args)); } catch (e) { return fail(e); } };

async function take(iter, max) {
  const out = [];
  for await (const x of iter) { out.push(x); if (out.length >= max) break; }
  return out;
}

const engine = z.enum(["google", "yandex", "bing"]).default("google").describe("Search engine");
const taskType = z.enum(["checker", "indexer"]).default("checker").describe("checker = index check, indexer = indexing task");
const urls = z.array(z.string().url()).min(1).max(10000).describe("URLs, up to 10,000");
const READ = { readOnlyHint: true, openWorldHint: true };
const SPEND = { readOnlyHint: false, destructiveHint: false, openWorldHint: true };

const server = new McpServer({ name: "speedyindex", version: VERSION });

server.registerTool("get_balance", {
  title: "Account balance",
  description: "SpeedyIndex balance: tokens, indexer credits and checker credits.",
  annotations: READ,
}, wrap(() => si().balance()));

server.registerTool("check_index", {
  title: "Check if URLs are indexed",
  description: "Create an index-check task in Google, Bing or Yandex for a list of URLs. Uses checker credits. Returns task_id; read the result with get_report once the task is processed.",
  inputSchema: { urls, engine, title: z.string().optional() },
  annotations: SPEND,
}, wrap(({ urls, engine, title }) => si().createTask(urls, { engine, taskType: "checker", title })));

server.registerTool("submit_for_indexing", {
  title: "Submit URLs for indexing",
  description: "Create an indexing task in Google or Yandex. Spends the user's balance (Google: pay-per-indexed mode). Ask the user before calling. drip_feed_days (2-30, Google only) spreads submissions over days.",
  inputSchema: {
    urls,
    engine: z.enum(["google", "yandex"]).default("google"),
    title: z.string().optional(),
    drip_feed_days: z.number().int().min(2).max(30).optional(),
  },
  annotations: SPEND,
}, wrap(({ urls, engine, title, drip_feed_days }) =>
  si().createTask(urls, { engine, taskType: "indexer", title, dripFeedDays: drip_feed_days })));

server.registerTool("list_tasks", {
  title: "List tasks",
  description: "Recent indexing or index-check tasks, newest first, with size, processed and indexed counts.",
  inputSchema: { engine, task_type: taskType, page: z.number().int().min(0).default(0) },
  annotations: READ,
}, wrap(({ engine, task_type, page }) => si().listTasks({ engine, taskType: task_type, page })));

server.registerTool("get_report", {
  title: "Task report",
  description: "Indexed and unindexed URLs of a task. full=true adds SERP titles and error codes (-1 noindex, 0 none, else HTTP status).",
  inputSchema: { task_id: z.string(), engine, task_type: taskType, full: z.boolean().default(false) },
  annotations: READ,
}, wrap(({ task_id, engine, task_type, full }) =>
  full ? si().fullReport(task_id, { engine, taskType: task_type }) : si().report(task_id, { engine, taskType: task_type })));

server.registerTool("check_backlinks", {
  title: "Check backlinks on donor pages",
  description: "Check donor pages for links to the given domains (anchors, rel, indexing). Spends tokens. Returns task_id for get_backlink_report.",
  inputSchema: { urls, target_domains: z.array(z.string()).min(1) },
  annotations: SPEND,
}, wrap(({ urls, target_domains }) => si().createBacklinkCheck(urls, target_domains)));

server.registerTool("get_backlink_report", {
  title: "Backlink check report",
  description: "Per-donor results of a backlink check task: DA, spam score, indexing status and the links found.",
  inputSchema: { task_id: z.string(), page: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(200).default(50) },
  annotations: READ,
}, wrap(({ task_id, page, limit }) => si().backlinkReport(task_id, { page, limit })));

server.registerTool("rank_projects", {
  title: "Rank Tracker projects",
  description: "List Rank Tracker projects (domain, regions, schedule, last check).",
  inputSchema: { search: z.string().optional(), max: z.number().int().min(1).max(500).default(100) },
  annotations: READ,
}, wrap(({ search, max }) => take(si().rank.projects({ search }), max)));

server.registerTool("rank_positions", {
  title: "Keyword positions",
  description: "Google positions of a project's keywords in a check (latest finished by default), with the change against the previous check. changed_only returns only keywords that moved.",
  inputSchema: {
    project_id: z.string(),
    check_id: z.string().optional(),
    region_id: z.string().optional(),
    tag: z.string().optional(),
    changed_only: z.boolean().optional(),
    max: z.number().int().min(1).max(5000).default(500),
  },
  annotations: READ,
}, wrap(({ project_id, check_id, region_id, tag, changed_only, max }) =>
  take(si().rank.positions(project_id, { checkId: check_id, regionId: region_id, tag, changedOnly: changed_only }), max)));

server.registerTool("rank_keyword_details", {
  title: "Keyword in a check: top 10 and AI Overview",
  description: "One keyword's result in a finished check: top-10 domains and the AI Overview (present, whether the site is cited, sources).",
  inputSchema: { check_id: z.string(), keyword_id: z.string(), region_id: z.string().optional() },
  annotations: READ,
}, wrap(({ check_id, keyword_id, region_id }) => si().rank.keywordInCheck(check_id, keyword_id, { regionId: region_id })));

server.registerTool("rank_cost", {
  title: "Cost of the next check",
  description: "What the project's next position check can cost, in tokens (cost.max is held while it runs).",
  inputSchema: { project_id: z.string() },
  annotations: READ,
}, wrap(({ project_id }) => si().rank.cost(project_id)));

server.registerTool("rank_run_check", {
  title: "Run a position check",
  description: "Queue a Google position check for a project. Spends tokens: call rank_cost and ask the user first. Poll with rank_check_status.",
  inputSchema: { project_id: z.string(), region_id: z.string().optional() },
  annotations: SPEND,
}, wrap(({ project_id, region_id }) => si().rank.runCheck(project_id, { regionId: region_id })));

server.registerTool("rank_check_status", {
  title: "Check status",
  description: "Status and progress of a Rank Tracker check (queued, running, done, failed).",
  inputSchema: { check_id: z.string() },
  annotations: READ,
}, wrap(({ check_id }) => si().rank.check(check_id)));

server.registerTool("rank_locations", {
  title: "Find a Google location",
  description: "Find a city, region or country for a Rank Tracker region; use canonical_name as location and country_code as gl.",
  inputSchema: { q: z.string(), gl: z.string().length(2).optional() },
  annotations: READ,
}, wrap(({ q, gl }) => si().rank.locations(q, { gl })));

const transport = new StdioServerTransport();
await server.connect(transport);
