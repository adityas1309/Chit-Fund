import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WalletProvider } from "../lib/wallet";
import { useWallet } from "../lib/use-wallet";

function Probe() {
  const w = useWallet();
  return (
    <div>
      <span data-testid="avail">{String(w.isAvailable)}</span>
      <span data-testid="conn">{String(w.isConnected)}</span>
      <span data-testid="pk">{w.publicKey ?? "null"}</span>
      <button data-testid="connect" onClick={() => w.connect().catch(() => undefined)}>connect</button>
      <button data-testid="disconnect" onClick={() => w.disconnect()}>disconnect</button>
    </div>
  );
}

describe("WalletProvider", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("starts in disconnected state when Freighter is not present", () => {
    render(
      <WalletProvider>
        <Probe />
      </WalletProvider>
    );
    expect(screen.getByTestId("conn").textContent).toBe("false");
    expect(screen.getByTestId("pk").textContent).toBe("null");
  });

  it("can disconnect when connected", () => {
    render(
      <WalletProvider>
        <Probe />
      </WalletProvider>
    );
    fireEvent.click(screen.getByTestId("disconnect"));
    expect(screen.getByTestId("conn").textContent).toBe("false");
  });
});
