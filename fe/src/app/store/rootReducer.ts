// Root Reducer / State Dispatchers for DCC NG ICD
// Note: Uses lightweight Context & TanStack Query cache without external Redux library

export interface AppState {
  siteId: string;
  roleCode: string;
  isExternal: boolean;
}

export type AppAction =
  | { type: 'SET_SITE'; payload: string }
  | { type: 'SET_ROLE'; payload: string };

export function rootReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SITE':
      return { ...state, siteId: action.payload };
    case 'SET_ROLE':
      return { ...state, roleCode: action.payload };
    default:
      return state;
  }
}
