import { create, increment, newKey, patch, read, transaction } from './firebase.js';
import { calculateDiscount, earnedPoints } from '../utils/orders.js';
import { formatTime, weekKey } from '../utils/format.js';

export async function placeOrder(data, user, settings, discounts, kind, challenge) {
  const now = new Date();
  const id = newKey('orders');
  const discount = calculateDiscount(data, discounts, kind);
  const pointsEarned = earnedPoints(settings);
  const commissionRate = Number(data.deliveryFee) > 0 ? Number(data.commission || 0) / Number(data.deliveryFee) : 0;
  const order = { ...data, ...discount, commission: (data.orderType === 'market' ? Math.max(0, Number(data.deliveryFee) - discount.discountAmount) : discount.price) * commissionRate,
    name: user.name, customerName: user.name, phone: user.phone, customerPhone: user.phone,
    customerArea: user.area, time: now.getTime(), orderTimeString: formatTime(`${now.getHours()}:${now.getMinutes()}`), pointsEarned };
  const updates = { [`orders/${id}`]: order };
  if (pointsEarned) updates[`users_points/${user.phone}`] = increment(pointsEarned);
  if (pointsEarned && settings.challengeActive !== false && !challenge.completed) updates[`users_challenges/${user.phone}/${weekKey(now)}/ordersCount`] = increment(1);
  await patch('/', updates);
  return { ...order, id };
}

export async function cancelCustomerOrder(id, phone) {
  const result = await transaction(`orders/${id}`, (order) => {
    if (!order || (order.phone !== phone && order.customerPhone !== phone) || order.status !== 'ready_for_driver') return undefined;
    return { ...order, status: 'cancelled', cancelledAt: Date.now(), cancelledBy: 'customer' };
  });
  if (!result.committed) throw new Error('الطلب اتحدث، راجع حالته الحالية');
  const order = result.snapshot.val();
  if (order.pointsEarned) await transaction(`users_points/${phone}`, (points) => Math.max(0, Number(points || 0) - Number(order.pointsEarned)));
}

export async function deductPoints(phone, cost) {
  if (!Number.isFinite(cost) || cost <= 0) throw new Error('إعدادات المكافأة غير متاحة حالياً');
  await read(`users_points/${phone}`);
  const result = await transaction(`users_points/${phone}`, (points) => {
    if (Number(points || 0) < cost) return undefined;
    return Number(points || 0) - cost;
  });
  if (!result.committed) throw new Error(`محتاج ${cost} نقطة`);
  return Number(result.snapshot.val());
}

export async function claimCard(phone, area, network, cost) {
  const node = network === 'vodafone' ? 'fakka_cards_vodafone' : 'fakka_cards_etisalat';
  const path = `reward_settings/${area}/${node}`;
  const cards = await read(path);
  const available = Object.entries(cards || {}).filter(([, card]) => card?.code);
  if (!available.length) throw new Error('مفيش كروت متاحة للشبكة دي');
  const [id, card] = available[Math.floor(Math.random() * available.length)];
  const reservation = await transaction(`${path}/${id}`, (current) => current?.code === card.code ? null : undefined);
  if (!reservation.committed) throw new Error('الكارت اتسحب، حاول تاني');
  let after;
  try { after = await deductPoints(phone, cost); }
  catch (error) { await patch(path, { [id]: card }); throw error; }
  const name = network === 'vodafone' ? 'فودافون' : 'اتصالات';
  await create(`rewards_history/${phone}`, { type: 'fakka', typeName: `كارت فكة ${name}`, network: name, cardCode: card.code, cost, pointsBefore: after + cost, pointsAfter: after, usedAt: Date.now() }).catch((error) => console.error('Could not save card history', error));
  return { code: card.code, network: name };
}

export async function rewardInvite(phone, settings) {
  if (settings.active === false || settings.inviteActive === false) return;
  const invitation = await read(`users_invites/${phone}`);
  if (!invitation?.inviter || invitation.rewarded) return;
  const result = await transaction(`users_invites/${phone}/rewarded`, (value) => value === true ? undefined : true);
  if (!result.committed) return;
  const reward = Math.max(0, Number(settings.inviteReward) || 0);
  await patch('/', { [`users_points/${phone}`]: increment(reward), [`users_points/${invitation.inviter}`]: increment(reward) });
}
