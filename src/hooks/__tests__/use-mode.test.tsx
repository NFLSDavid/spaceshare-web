// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useModeStore } from "@/stores/mode-store";
import { useMode } from "../use-mode";

describe("useMode", () => {
  beforeEach(() => {
    useModeStore.setState({ isHostMode: false });
  });

  it("returns store methods", () => {
    const { result } = renderHook(() => useMode());
    expect(result.current.isHostMode).toBe(false);
    expect(typeof result.current.setHostMode).toBe("function");
    expect(typeof result.current.toggleMode).toBe("function");
  });

  it("toggleMode updates state", () => {
    const { result } = renderHook(() => useMode());
    act(() => {
      result.current.toggleMode();
    });
    expect(result.current.isHostMode).toBe(true);
  });

  it("setHostMode updates state", () => {
    const { result } = renderHook(() => useMode());
    act(() => {
      result.current.setHostMode(true);
    });
    expect(result.current.isHostMode).toBe(true);
  });
});
