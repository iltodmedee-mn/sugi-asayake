import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";

/**
 * 2026-11-07: uptime.yml-д `TITLE: ${{ … format('{0}: …') … }}` гэсэн хашилтгүй утга
 * YAML-ийн хувьд хүчингүй байсан тул GitHub workflow-ийг 09-24-өөс 11-07 хүртэл ОГТ
 * ажиллуулаагүй — production DB хоёр удаа унахад утсанд мэдэгдэл ирээгүй. GitHub
 * хүчингүй workflow-д алдаа өгдөггүй (push бүрт 0 секундын "failure" л үлдээдэг),
 * тиймээс файл бүрийг энд parse хийж, хуваарьтай/гараар ажиллах ёстой workflow-ийн
 * `on` хэвээр байгааг шалгана.
 */
const WORKFLOW_DIR = join(import.meta.dirname, "..", ".github", "workflows");
const workflows = readdirSync(WORKFLOW_DIR).filter(name => /\.ya?ml$/.test(name));

describe("GitHub workflows", () => {
  it("хавтаст workflow байгаа", () => {
    expect(workflows.length).toBeGreaterThan(0);
  });

  it.each(workflows)("%s нь хүчинтэй YAML, `on` ба `jobs`-той", name => {
    const doc = parseDocument(readFileSync(join(WORKFLOW_DIR, name), "utf8"));
    expect(doc.errors.map(e => e.message)).toEqual([]);
    const value = doc.toJS() as { on?: unknown; jobs?: Record<string, unknown> };
    expect(value.on).toBeTruthy();
    expect(Object.keys(value.jobs ?? {}).length).toBeGreaterThan(0);
  });

  it("uptime нь 10 минут тутам ажиллах хуваарьтай", () => {
    const value = parseDocument(readFileSync(join(WORKFLOW_DIR, "uptime.yml"), "utf8")).toJS() as { on: { schedule?: Array<{ cron: string }> } };
    expect(value.on.schedule?.map(s => s.cron)).toContain("*/10 * * * *");
  });
});
