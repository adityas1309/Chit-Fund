import { describe, it, expect } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ToastProvider } from "../lib/toast";
import { useToast } from "../lib/use-toast";

function Probe() {
  const t = useToast();
  return (
    <div>
      <button data-testid="info" onClick={() => t.show("info", "hello")}>info</button>
      <button data-testid="err" onClick={() => t.show("error", "boom")}>err</button>
      <span data-testid="count">{t.toasts.length}</span>
    </div>
  );
}

describe("ToastProvider", () => {
  it("adds toasts", () => {
    render(
      <ToastProvider>
        <Probe />
      </ToastProvider>
    );
    expect(screen.getByTestId("count").textContent).toBe("0");
    act(() => {
      fireEvent.click(screen.getByTestId("info"));
    });
    expect(screen.getByTestId("count").textContent).toBe("1");
  });
});
