import type { ReactElement } from 'react';

/** Screen route definition */
export interface RouteDef {
  path: string;
  element: ReactElement;
  title?: string;
  permission?: string;
}
