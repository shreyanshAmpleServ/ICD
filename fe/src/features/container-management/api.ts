import { unitsApi } from './units/api';
import { consignmentsApi } from './consignments/api';
import { vesselCallsApi } from './vessel-calls/api';
import { manifestsApi } from './manifests/api';
import { customsApi } from '../customs/api';
import { holdsApi } from './holds/api';
import { releasesApi } from './releases/api';
import { dangerousGoodsApi } from './dangerous-goods/api';

export {
  unitsApi,
  consignmentsApi,
  vesselCallsApi,
  manifestsApi,
  customsApi,
  holdsApi,
  releasesApi,
  dangerousGoodsApi
};

export const cargoApi = {
  ...unitsApi,
  ...consignmentsApi,
  ...vesselCallsApi,
  ...manifestsApi,
  ...customsApi,
  ...holdsApi,
  ...releasesApi,
  ...dangerousGoodsApi
};
