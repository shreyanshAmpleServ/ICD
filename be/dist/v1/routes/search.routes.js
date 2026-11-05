"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRouter = void 0;
const express_1 = require("express");
const siteScope_1 = require("../../middlewares/siteScope");
const search_controller_1 = require("../controllers/search/search.controller");
exports.searchRouter = (0, express_1.Router)();
// Global unified search across database entities
exports.searchRouter.get('/search', (0, siteScope_1.requireSite)(true), search_controller_1.searchController.globalSearch);
exports.default = exports.searchRouter;
