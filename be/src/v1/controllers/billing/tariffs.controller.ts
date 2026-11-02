import { tariffsController } from '../tariffs.controller';

export const billingTariffsController = {
  getTariffs: tariffsController.getTariffs,
  getTariffRates: tariffsController.getTariffRates,
  getTariffById: tariffsController.getTariffById,
  getTariffRules: tariffsController.getTariffRules,
  createTariff: tariffsController.createTariff,
  updateTariff: tariffsController.updateTariff,
  submitTariff: tariffsController.submitTariff,
  newVersion: tariffsController.newVersion,
};

export default billingTariffsController;
