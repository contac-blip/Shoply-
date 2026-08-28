import {
  validateStatusTransition,
  getFulfillmentProgress,
  getAllowedTransitions,
} from '../src_js/fulfillment/fulfillmentService.js';

describe('fulfillment lifecycle', () => {
  test('allows valid transitions in the fulfillment workflow', () => {
    const result = validateStatusTransition('packed', 'ready_for_dispatch');

    expect(result.allowed).toBe(true);
    expect(result.reason).toMatch(/valid/i);
  });

  test('rejects invalid transitions', () => {
    const result = validateStatusTransition('delivered', 'packed');

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not allowed/i);
  });

  test('reports progress for each fulfillment status', () => {
    const progress = getFulfillmentProgress('in_transit');

    expect(progress.value).toBe(80);
    expect(progress.label).toBe('In Transit');
    expect(progress.isFinal).toBe(false);
  });

  test('lists valid next statuses for a current state', () => {
    const allowed = getAllowedTransitions('pending');

    expect(allowed).toEqual(expect.arrayContaining(['packed', 'cancelled']));
  });
});
