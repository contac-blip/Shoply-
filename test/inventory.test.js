import { calculateStockState, validateReservationAvailability } from '../src_js/inventory/inventoryService.js';

describe('inventory stock calculations', () => {
  test('calculates available and low-stock states correctly', () => {
    const state = calculateStockState({
      on_hand_quantity: 20,
      reserved_quantity: 6,
      reorder_level: 8,
    });

    expect(state.on_hand_quantity).toBe(20);
    expect(state.reserved_quantity).toBe(6);
    expect(state.available_quantity).toBe(14);
    expect(state.is_low_stock).toBe(false);
    expect(state.is_out_of_stock).toBe(false);
  });

  test('rejects reservation when stock is insufficient', () => {
    const result = validateReservationAvailability({
      on_hand_quantity: 5,
      reserved_quantity: 3,
      requested_quantity: 4,
      reorder_level: 2,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/insufficient/i);
    expect(result.available_quantity).toBe(2);
  });

  test('allows reservation when enough stock remains', () => {
    const result = validateReservationAvailability({
      on_hand_quantity: 12,
      reserved_quantity: 3,
      requested_quantity: 4,
      reorder_level: 2,
    });

    expect(result.allowed).toBe(true);
    expect(result.available_quantity).toBe(9);
  });
});
