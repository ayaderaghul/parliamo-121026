import { describe, it, expect } from "vitest";
import { emptyProgress, nodeStatuses, replay, type TestRecord } from "../src/shared/progress";

/** A finished test where every answer is right, built the way the browser does. */
function flawless(at: string): TestRecord {
  const seed = 99;
  const events: TestRecord["events"] = [];
  for (;;) {
    const s = replay(seed, events);
    if (s.done) break;
    events.push({ skillId: s.current!, correct: true, ms: 1000, at });
  }
  return { id: "t", seed, events, status: "done", createdAt: at };
}

describe("nodeStatuses", () => {
  it("is all unasked with no progress", () => {
    expect(new Set(Object.values(nodeStatuses(emptyProgress())))).toEqual(new Set(["unasked"]));
  });

  it("marks answered nodes right and their prerequisites credited", () => {
    const st = nodeStatuses({ ...emptyProgress(), last: flawless("2026-10-01T10:00:00.000Z") });
    expect(Object.values(st)).toContain("right");
    expect(Object.values(st)).toContain("credited");
    expect(Object.values(st)).not.toContain("wrong");
  });

  it("lets newer practice override the test, and not older practice", () => {
    const last = flawless("2026-10-01T10:00:00.000Z");
    const id = last.events[0].skillId;
    const newer = nodeStatuses({ ...emptyProgress(), last, practice: [{ skillId: id, correct: false, at: "2026-10-02T10:00:00.000Z" }] });
    const older = nodeStatuses({ ...emptyProgress(), last, practice: [{ skillId: id, correct: false, at: "2026-09-01T10:00:00.000Z" }] });
    expect(newer[id]).toBe("wrong");
    expect(older[id]).toBe("right");
  });
});
