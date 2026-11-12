import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDiscount, earnedPoints, visibleOrders } from '../src/utils/orders.js';
import { withinWorkHours, validPhone, whatsappUrl, escapeText } from '../src/utils/format.js';

test('market coupon removes only delivery while preserving original price', () => {
  const result = calculateDiscount({ price: 125, originalPrice: 125, deliveryFee: 25 }, { coupon: true, amount: 99 }, 'delivery');
  assert.equal(result.price, 100);
  assert.equal(result.originalPrice, 125);
  assert.equal(result.discountAmount, 25);
});
test('trip discount can fully cover a trip without a negative price', () => {
  const result = calculateDiscount({ price: 15, deliveryFee: 15 }, { coupon: true, amount: 20 }, 'trip');
  assert.equal(result.price, 0);
  assert.equal(result.discountAmount, 15);
});
test('trip discount does not discount delivery or shipping', () => {
  assert.equal(calculateDiscount({ price: 25, deliveryFee: 25 }, { amount: 20 }, 'delivery').price, 25);
  assert.equal(calculateDiscount({ price: 30, deliveryFee: 30 }, { coupon: true, amount: 20 }, 'none').price, 30);
});
test('disabled rewards earn zero and active double rewards earn twice', () => {
  assert.equal(earnedPoints({ active: false, pointsPerOrder: 10, doublePointsActive: true }), 0);
  assert.equal(earnedPoints({ active: true, pointsPerOrder: 10, doublePointsActive: true }), 20);
  assert.equal(earnedPoints({ active: true, pointsPerOrder: 0 }), 0);
});
test('order filtering keeps shipping separate and history limited to 30 days', () => {
  const now = Date.UTC(2026, 10, 12);
  const orders = [
    { id: 'a', phone: '01111111111', status: 'ready_for_driver', time: now },
    { id: 'b', customerPhone: '01111111111', status: 'completed', time: now },
    { id: 'ship', phone: '01111111111', status: 'active', isShipping: true },
    { id: 'old', phone: '01111111111', status: 'completed', time: now - 31 * 86400000 },
    { id: 'other', phone: '01222222222', status: 'active' },
  ];
  assert.deepEqual(visibleOrders(orders, '01111111111', false, now).map((order) => order.id), ['a']);
  assert.deepEqual(visibleOrders(orders, '01111111111', true, now).map((order) => order.id), ['b']);
});
test('work hours handle overnight shifts, midnight closing, and boundaries', () => {
  const at = (hours, minutes = 0) => new Date(2026, 10, 12, hours, minutes);
  assert.equal(withinWorkHours('20:00', '03:00', at(23)), true);
  assert.equal(withinWorkHours('20:00', '03:00', at(2)), true);
  assert.equal(withinWorkHours('20:00', '03:00', at(3)), false);
  assert.equal(withinWorkHours('08:00', '00:00', at(23, 59)), true);
  assert.equal(withinWorkHours('08:00', '17:00', at(8)), true);
  assert.equal(withinWorkHours('08:00', '17:00', at(17)), false);
});
test('registration phone validation and Egyptian WhatsApp number formatting', () => {
  assert.equal(validPhone('01115699940'), true);
  assert.equal(validPhone('0111569994x'), false);
  assert.equal(validPhone('0111569994'), false);
  assert.ok(whatsappUrl('01115699940').startsWith('https://wa.me/201115699940?'));
});
test('user text remains escaped in stored order details', () => {
  assert.equal(escapeText('<script>"x"</script>'), '&lt;script&gt;&quot;x&quot;&lt;/script&gt;');
});
