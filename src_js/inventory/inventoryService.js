export function calculateStockState({
  on_hand_quantity = 0,
  reserved_quantity = 0,
  reorder_level = 0,
} = {}) {
  const safeOnHand = Number(on_hand_quantity) || 0;
  const safeReserved = Number(reserved_quantity) || 0;
  const safeReorderLevel = Number(reorder_level) || 0;
  const available_quantity = Math.max(safeOnHand - safeReserved, 0);

  return {
    on_hand_quantity: safeOnHand,
    reserved_quantity: safeReserved,
    available_quantity,
    reorder_level: safeReorderLevel,
    is_low_stock: available_quantity <= safeReorderLevel,
    is_out_of_stock: available_quantity <= 0,
  };
}

export function validateReservationAvailability({
  on_hand_quantity = 0,
  reserved_quantity = 0,
  requested_quantity = 1,
  reorder_level = 0,
} = {}) {
  const state = calculateStockState({
    on_hand_quantity,
    reserved_quantity,
    reorder_level,
  });

  const available_quantity = state.available_quantity;
  const allowed = Number(requested_quantity) <= available_quantity;

  return {
    ...state,
    requested_quantity: Number(requested_quantity) || 0,
    available_quantity,
    allowed,
    reason: allowed
      ? 'stock available for reservation'
      : `Insufficient stock: requested ${Number(requested_quantity) || 0}, available ${available_quantity}`,
  };
}

export function reserveInventory({
  on_hand_quantity = 0,
  reserved_quantity = 0,
  requested_quantity = 1,
  reorder_level = 0,
} = {}) {
  const validation = validateReservationAvailability({
    on_hand_quantity,
    reserved_quantity,
    requested_quantity,
    reorder_level,
  });

  if (!validation.allowed) {
    return {
      ...validation,
      reserved_quantity_after: reserved_quantity,
      on_hand_quantity_after: on_hand_quantity,
    };
  }

  return {
    ...validation,
    reserved_quantity_after: reserved_quantity + Number(requested_quantity),
    on_hand_quantity_after: on_hand_quantity,
    reserved: true,
  };
}

export function releaseReservation({
  on_hand_quantity = 0,
  reserved_quantity = 0,
  released_quantity = 1,
} = {}) {
  const safeReleased = Number(released_quantity) || 0;
  const updatedReserved = Math.max(reserved_quantity - safeReleased, 0);

  return {
    on_hand_quantity,
    reserved_quantity: updatedReserved,
    released_quantity: safeReleased,
    available_quantity: Math.max(on_hand_quantity - updatedReserved, 0),
  };
}
