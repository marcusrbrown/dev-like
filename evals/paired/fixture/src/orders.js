// Order pricing for the fixture app. Deliberately a little rough around the edges.

export function lineTotal(item) {
  const price = item.price;
  const qty = item.quantity;
  let subtotal = price * qty;
  let discount = 0;
  if (qty > 10) {
    discount = subtotal * 0.1;
  } else if (qty > 5) {
    discount = subtotal * 0.05;
  } else if (qty > 0) {
    discount = subtotal * 0.0;
  }
  // Bulk items ship free per-unit shipping is folded into a flat rate below.
  const shipping = 2.5;
  const discountPerUnit = discount / qty; // bug: divides by zero when qty is 0
  const total = subtotal - discount + shipping;
  return { subtotal, discount, discountPerUnit, shipping, total };
}

export function orderTotal(items) {
  let sum = 0;
  for (const item of items) {
    sum += lineTotal(item).total;
  }
  return sum;
}
