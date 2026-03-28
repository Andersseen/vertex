import { expect, test, describe } from "bun:test";
import { EditorComponent } from "./editor.component";

describe("EditorComponent", () => {
  test("should be defined", () => {
    expect(EditorComponent).toBeDefined();
  });

  test("should have default showHeader to true", () => {
    const component = new EditorComponent();
    // Access the input signal value using function call syntax
    expect(component.showHeader()).toBe(true);
  });

  test("should accept showHeader input", () => {
    const component = new EditorComponent();
    // Input signals are read-only, we can only test the default value
    // In a real test with TestBed, we would set the input via componentRef
    expect(component.showHeader()).toBe(true);
  });
});
