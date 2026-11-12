export const DEFAULT_REWARDS = Object.freeze({ active: true, pointsPerOrder: 10, discountCost: 100, tripDiscountCost: 50, directDiscountValue: 20, fakkaCost: 150, doublePointsActive: false, challengeActive: true, challengeTarget: 5, challengeReward: 100, inviteActive: true, inviteReward: 50, showFakka: true, showFakkaButton: true });
export function calculateDiscount(order, discounts, kind) {
  const originalPrice = Math.max(0, Number(order.originalPrice ?? order.price) || 0);
  const delivery = Math.max(0, Number(order.deliveryFee) || 0);
  const discountAmount = kind === 'trip' ? Math.min(originalPrice, Math.max(0, Number(discounts.amount) || 0)) : kind === 'delivery' && discounts.coupon ? Math.min(originalPrice, delivery) : 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount);
  return { originalPrice, price: finalPrice, finalPrice, hasDiscount: discountAmount > 0, discountAmount, discountType: discountAmount > 0 ? (kind === 'trip' ? 'خصم مالي' : 'توصيل مجاني') : 'none' };
}
export function earnedPoints(settings) {
  if (settings.active === false || settings.active === 'false') return 0;
  return Math.max(0, Number(settings.pointsPerOrder) || 0) * (settings.doublePointsActive === true ? 2 : 1);
}
export function isActiveOrder(order) { return ['ready_for_driver', 'active'].includes(order.status); }
export function visibleOrders(orders, phone, history = false, now = Date.now()) {
  return orders.filter((order) => (order.phone === phone || order.customerPhone === phone) && !order.isShipping)
    .filter((order) => history ? ['completed', 'cancelled'].includes(order.status) && now - (order.completedAt || order.cancelledAt || order.time || 0) <= 30 * 86400000 : isActiveOrder(order))
    .sort((a, b) => (b.time || 0) - (a.time || 0));
}
