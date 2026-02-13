import { describe, it, expect, beforeEach } from "vitest";
import { useModeStore } from "../mode-store";

describe("useModeStore", () => {
  beforeEach(() => {
    useModeStore.setState({ isHostMode: false });
  });

  it("default isHostMode is false", () => {
    expect(useModeStore.getState().isHostMode).toBe(false);
  });

  it("setHostMode sets to true", () => {
    useModeStore.getState().setHostMode(true);
    expect(useModeStore.getState().isHostMode).toBe(true);
  });

  it("setHostMode sets to false", () => {
    useModeStore.getState().setHostMode(true);
    useModeStore.getState().setHostMode(false);
    expect(useModeStore.getState().isHostMode).toBe(false);
  });

  it("toggleMode flips from false to true", () => {
    useModeStore.getState().toggleMode();
    expect(useModeStore.getState().isHostMode).toBe(true);
  });

  it("toggleMode flips from true to false", () => {
    useModeStore.getState().setHostMode(true);
    useModeStore.getState().toggleMode();
    expect(useModeStore.getState().isHostMode).toBe(false);
  });
});
