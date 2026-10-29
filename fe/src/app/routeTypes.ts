import type { ReactElement } from 'react';

/** A screen route. Each module exports `routes: RouteDef[]` from its index.tsx. */
export interface RouteDef { path: string; element: ReactElement }
