import { Router } from 'express';
import { requireSite } from '../../middlewares/siteScope';
import { searchController } from '../controllers/search/search.controller';

export const searchRouter = Router();

// Global unified search across database entities
searchRouter.get('/search', requireSite(true), searchController.globalSearch);

export default searchRouter;

