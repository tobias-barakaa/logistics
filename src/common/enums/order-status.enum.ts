
  export enum OrderStatus {
    PENDING = 'pending',       // created, not yet assigned
    ASSIGNED = 'assigned',     // driver assigned, not yet picked up
    PICKED_UP = 'picked_up',   // driver confirmed pickup
    IN_TRANSIT = 'in_transit', // en-route to delivery
    DELIVERED = 'delivered',   // successfully delivered
    FAILED = 'failed',         // delivery attempted but failed
    CANCELLED = 'cancelled',   // cancelled before pickup
  }