import { chargesController } from '../charges.controller';

export const billingChargesController = {
  getCharges: chargesController.getCharges,
  getOpenCharges: chargesController.getOpenCharges,
  waiveCharge: chargesController.waiveCharge,
  addManualCharge: chargesController.addManualCharge,
};
