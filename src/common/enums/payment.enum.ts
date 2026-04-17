// src/common/enums/payment.enum.ts
export enum PaymentStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
  }
  
  export enum PaymentMethod {
    COD = 'COD',    // Cash on Delivery
    CARD = 'CARD',
    MOMO = 'MOMO',  // Mobile Money (M-Pesa, Airtel Money)
    BANK = 'BANK',
    WALLET = 'WALLET',
  }