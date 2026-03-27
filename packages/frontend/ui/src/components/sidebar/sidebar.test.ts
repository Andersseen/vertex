import { expect, test, describe } from "bun:test";
import { SidebarComponent } from "./sidebar.component";

describe("SidebarComponent", () => {
  test("should be defined", () => {
    expect(SidebarComponent).toBeDefined();
  });

  test("should have empty treeNodes by default", () => {
    const component = new SidebarComponent();
    expect(component.treeNodes()).toEqual([]);
  });

  test("should have selectedNode null by default", () => {
    const component = new SidebarComponent();
    expect(component.selectedNode()).toBeNull();
  });
});
