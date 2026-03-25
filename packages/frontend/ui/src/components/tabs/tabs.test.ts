import { expect, test, describe } from "bun:test";
import { TabsComponent } from "./tabs.component";

describe("TabsComponent", () => {
  test("should be defined", () => {
    expect(TabsComponent).toBeDefined();
  });

  test("should have empty files array by default", () => {
    const component = new TabsComponent();
    expect(component.files).toEqual([]);
  });

  test("should have activeFileId null by default", () => {
    const component = new TabsComponent();
    expect(component.activeFileId).toBeNull();
  });
});
