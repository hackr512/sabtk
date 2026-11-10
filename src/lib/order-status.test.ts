import { describe, expect, it } from "vitest";
import { validOrderTransition } from "./order-status";
describe("controlled order progression", () => {
  it("does not deliver an unconfirmed order", () => expect(validOrderTransition("pending_confirmation", "delivered")).toBe(false));
  it("supports ready for dispatch", () => expect(validOrderTransition("preparing", "ready_for_dispatch")).toBe(true));
  it("supports failed delivery", () => expect(validOrderTransition("out_for_delivery", "failed_delivery")).toBe(true));
  it("does not reopen a cancelled order", () => expect(validOrderTransition("cancelled", "confirmed")).toBe(false));
  it("allows delivered-order return requests", () => expect(validOrderTransition("delivered", "return_requested")).toBe(true));
});