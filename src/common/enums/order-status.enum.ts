// src/common/enums/order-status.enum.ts
export enum OrderStatus {
    PENDING = 'PENDING',         // Created, waiting for driver assignment
    ASSIGNED = 'ASSIGNED',       // Driver assigned, not yet picked up
    PICKED_UP = 'PICKED_UP',     // Driver confirmed pickup from sender
    IN_TRANSIT = 'IN_TRANSIT',   // En-route to delivery address
    DELIVERED = 'DELIVERED',     // Successfully delivered
    FAILED = 'FAILED',           // Delivery attempted but failed
    CANCELLED = 'CANCELLED',     // Cancelled before pickup
  }
  
  // Valid transitions — key = current status, value = statuses it can move TO
  export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]:    [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
    [OrderStatus.ASSIGNED]:   [OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
    [OrderStatus.PICKED_UP]:  [OrderStatus.IN_TRANSIT, OrderStatus.FAILED],
    [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.FAILED],
    [OrderStatus.DELIVERED]:  [],   // terminal
    [OrderStatus.FAILED]:     [OrderStatus.PENDING], // can be re-attempted
    [OrderStatus.CANCELLED]:  [],   // terminal
  };