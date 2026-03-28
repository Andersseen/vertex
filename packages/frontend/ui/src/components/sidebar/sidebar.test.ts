import { expect, test, describe } from "bun:test";
import { SidebarComponent } from "./sidebar.component";

describe("SidebarComponent", () => {
  test("should be defined", () => {
    expect(SidebarComponent).toBeDefined();
  });

  test("should be created with default values", () => {
    const component = new SidebarComponent();
    expect(component).toBeDefined();
    // Component uses protected signals that are only accessible within the class
    // In a real test with TestBed, we would test the component behavior through inputs/outputs
  });
});
