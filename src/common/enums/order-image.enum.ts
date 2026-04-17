// src/common/enums/order-priority.enum.ts
export enum OrderPriority {
    NORMAL = 'NORMAL',       // Standard delivery
    EXPRESS = 'EXPRESS',     // Same-day / faster
    EMERGENCY = 'EMERGENCY', // Urgent — jump the queue
  }
  
  // src/common/enums/order-image.enum.ts
  export enum ImageType {
    ITEM = 'ITEM',                       // Photo of the parcel/item
    SIGNATURE = 'SIGNATURE',             // Customer signature at delivery
    DELIVERY_PROOF = 'DELIVERY_PROOF',   // Photo of delivered parcel at door
    PICKUP_PROOF = 'PICKUP_PROOF',       // Photo confirming pickup from sender
    DAMAGE_REPORT = 'DAMAGE_REPORT',     // Photo of damaged parcel
  }
  
  export enum UploadedBy {
    ADMIN = 'ADMIN',
    DRIVER = 'DRIVER',
  }