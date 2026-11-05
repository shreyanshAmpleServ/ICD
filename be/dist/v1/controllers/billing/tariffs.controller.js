"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingTariffsController = void 0;
const tariffs_controller_1 = require("../tariffs.controller");
exports.billingTariffsController = {
    getTariffs: tariffs_controller_1.tariffsController.getTariffs,
    getTariffRates: tariffs_controller_1.tariffsController.getTariffRates,
    getTariffById: tariffs_controller_1.tariffsController.getTariffById,
    getTariffRules: tariffs_controller_1.tariffsController.getTariffRules,
    createTariff: tariffs_controller_1.tariffsController.createTariff,
    updateTariff: tariffs_controller_1.tariffsController.updateTariff,
    submitTariff: tariffs_controller_1.tariffsController.submitTariff,
    newVersion: tariffs_controller_1.tariffsController.newVersion,
};
exports.default = exports.billingTariffsController;
