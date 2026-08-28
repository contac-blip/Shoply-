import {
  validateShipmentStatusTransition,
  createReturnRequest,
  calculateRefundAmount,
} from '../src_js/fulfillment/shipmentService.js';

describe('shipment and return workflows', () => {
  test('allows valid shipment transitions', () => {
    const result = validateShipmentStatusTransition('packed', 'in_transit');

    expect(result.allowed).toBe(true);
    expect(result.reason).toMatch(/valid/i);
  });

  test('rejects invalid shipment transitions', () => {
    const result = validateShipmentStatusTransition('delivered', 'in_transit');

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not allowed/i);
  });

  test('creates a return request with refund amount', () => {
    const request = createReturnRequest({
      orderTotal: 2000,
      returnedAmount: 500,
      refundPercent: 25,
    });

    expect(request.status).toBe('requested');
    expect(request.refundAmount).toBe(500);
    expect(request.refundPercentage).toBe(25);
  });

  test('calculates refund based on order total and percent', () => {
    const refund = calculateRefundAmount({ orderTotal: 3000, refundPercent: 20 });

    expect(refund).toBe(600);
  });
});
