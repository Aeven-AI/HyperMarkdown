import { describe, expect, it } from "vitest";

import { canRender } from "../../../lib/mermaid/renderable";

const gantt = [
  "gantt",
  "    title A Gantt Diagram",
  "    dateFormat  YYYY-MM-DD",
  "    section Section",
];

function ganttWith(...rows: string[]): string {
  return gantt.concat(rows).join("\n");
}

describe("canRender", () => {
  it("leaves every other diagram type to the engine", () => {
    // These draw what they have, or throw and let the render path catch it.
    expect(canRender("flowchart TD")).toBe(true);
    expect(canRender("sequenceDiagram")).toBe(true);
    expect(canRender("gitGraph")).toBe(true);
    expect(canRender("")).toBe(true);
    // "pied" is not "pie": the header has to be the whole word.
    expect(canRender("piedPiper foo")).toBe(true);
  });

  describe("gantt", () => {
    it("holds back a chart with no task to place", () => {
      expect(canRender("gantt")).toBe(false);
      expect(canRender("  GANTT  ")).toBe(false);
      expect(canRender(gantt.join("\n"))).toBe(false);
      // Every directive it allows ahead of the first task.
      expect(
        canRender(
          ganttWith("    excludes weekends", "    todayMarker off", "%% note"),
        ),
      ).toBe(false);
    });

    it("draws once a task carries a duration or a start and an end", () => {
      expect(canRender(ganttWith("A task :a1, 2024-01-01, 30d"))).toBe(true);
      expect(canRender(ganttWith("Another :after a1, 20d"))).toBe(true);
      // A duration on its own is a whole task.
      expect(canRender(ganttWith("another task :24d"))).toBe(true);
      // A start and an end, rather than a duration.
      expect(canRender(ganttWith("spanned :done, d1, 2014-01-06, 2014-01-08"))).toBe(
        true,
      );
    });

    it("holds back while the last task is still being typed", () => {
      // A bar that has somewhere to begin but nowhere to stop.
      expect(canRender(ganttWith("Task in sec :2024-01-12"))).toBe(false);
      // Mid-duration: the unit has not arrived.
      expect(canRender(ganttWith("A task :a1, 2024-01-01, 3"))).toBe(false);
      // The colon itself has not arrived.
      expect(canRender(ganttWith("A task"))).toBe(false);

      // Earlier tasks being complete does not rescue the one still arriving:
      // it drags the whole layout out of shape.
      expect(
        canRender(ganttWith("A task :a1, 2024-01-01, 30d", "Task in sec :2024-01-12")),
      ).toBe(false);
    });

    it("keeps drawing when a directive follows the last complete task", () => {
      expect(
        canRender(ganttWith("A task :a1, 2024-01-01, 30d", "    section Another")),
      ).toBe(true);
      expect(canRender(ganttWith("A task :24d", "", "  "))).toBe(true);
    });
  });

  describe("pie", () => {
    it("holds back a chart with no slice yet", () => {
      expect(canRender("pie")).toBe(false);
      expect(canRender("pie title Pets adopted by volunteers")).toBe(false);
      expect(canRender("pie showData\n    title Pets\n%% note")).toBe(false);
    });

    it("draws once a slice has its number", () => {
      expect(canRender('pie title Pets\n    "Dogs" : 386')).toBe(true);
      expect(canRender('pie\n    "Dogs" : 386\n    "Cats" : 85.5')).toBe(true);
    });

    it("holds back while the last slice is still being typed", () => {
      expect(canRender('pie title Pets\n    "Dogs" :')).toBe(false);
      expect(canRender('pie title Pets\n    "Dogs"')).toBe(false);
      expect(canRender('pie title Pets\n    "Dogs" : 386\n    "Cats" :')).toBe(false);
    });
  });
});
