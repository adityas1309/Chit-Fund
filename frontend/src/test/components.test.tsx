import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "../components/Spinner";
import { CountdownTimer } from "../components/CountdownTimer";
import { RoundProgress } from "../components/RoundProgress";

describe("UI primitives", () => {
  it("renders the spinner", () => {
    render(<Spinner label="Loading" />);
    expect(screen.getByText("Loading")).toBeInTheDocument();
  });

  it("shows the round-robin progress", () => {
    render(<RoundProgress currentRound={2} totalRounds={5} depositsCount={2} totalMembers={4} />);
    expect(screen.getByText(/Round 2 of 5/)).toBeInTheDocument();
  });

  it("renders the countdown when the deadline is in the past", () => {
    render(<CountdownTimer deadlineLedger={100} currentLedger={150} />);
    expect(screen.getByText(/Ready to close/i)).toBeInTheDocument();
  });
});
