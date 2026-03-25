import { expect, test, describe } from "bun:test";
import { EditorComponent } from "./editor.component";

describe("EditorComponent", () => {
  test("should be defined", () => {
    expect(EditorComponent).toBeDefined();
  });

  test("should have default showHeader to true", () => {
    const component = new EditorComponent();
    expect(component.showHeader).toBe(true);
  });

  test("should have isDirty false by default", () => {
    const component = new EditorComponent();
    expect(component.isDirty).toBe(false);
  });
});
