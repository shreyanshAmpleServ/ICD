import { Router } from 'express';
import { cashierController } from '../../controllers/cashier.controller';
import { requireSite } from '../../../middlewares/siteScope';

export const cashierRouter = Router();

// ==========================================
// 1. Payments Endpoints
// ==========================================
cashierRouter.get(
  '/payments',
  requireSite(false),
  cashierController.getPayments
);

cashierRouter.post(
  '/payments',
  requireSite(false),
  cashierController.recordPayment
);

cashierRouter.get(
  '/payments/:paymentId',
  requireSite(false),
  cashierController.getPaymentById
);

cashierRouter.post(
  ['/payments/:paymentId/allocate', '/payments/:paymentId([0-9a-zA-Z_.-]+):allocate'],
  requireSite(false),
  cashierController.allocatePayment
);

cashierRouter.post(
  ['/payments/:paymentId/reverse', '/payments/:paymentId([0-9a-zA-Z_.-]+):reverse'],
  requireSite(false),
  cashierController.reversePayment
);

cashierRouter.get(
  '/payments/:paymentId/receipt',
  requireSite(false),
  cashierController.getPaymentReceipt
);

// ==========================================
// 2. Cashier Shifts Endpoints
// ==========================================
cashierRouter.get(
  '/cashier-shifts',
  requireSite(false),
  cashierController.getShifts
);

cashierRouter.post(
  ['/cashier-shifts', '/cashier-shifts/open'],
  requireSite(false),
  cashierController.openShift
);

cashierRouter.get(
  '/cashier-shifts/current',
  requireSite(false),
  cashierController.getCurrentShift
);

cashierRouter.post(
  ['/cashier-shifts/:shiftId/close', '/cashier-shifts/:shiftId([0-9a-zA-Z_.-]+):close'],
  requireSite(false),
  cashierController.closeShift
);

cashierRouter.post(
  ['/cashier-shifts/:shiftId/approve', '/cashier-shifts/:shiftId([0-9a-zA-Z_.-]+):approve'],
  requireSite(false),
  cashierController.approveShift
);

// ==========================================
// 3. Payment Channels
// ==========================================
cashierRouter.get(
  ['/payment-channels', '/channels'],
  requireSite(false),
  cashierController.getChannels
);

