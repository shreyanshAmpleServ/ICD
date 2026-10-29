import { useSession } from './session';

/* Shell strings in English and Swahili. Screen text stays English in the
   prototype; the real app loads all strings from resource files.
   Swahili here is a first draft: have a native speaker review it. */
const SW: Record<string, string> = {
  Today: 'Leo', 'Gate & yard': 'Geti na yadi', Cargo: 'Mizigo', Money: 'Fedha', Control: 'Udhibiti', Customers: 'Wateja', Setup: 'Mipangilio',
  Home: 'Mwanzo', 'Control tower': 'Kituo cha udhibiti', Inbox: 'Kikasha', 'Gate queue': 'Foleni ya geti', 'Gate lane (tablet)': 'Njia ya geti (tableti)',
  'Yard map': 'Ramani ya yadi', 'Move orders': 'Maagizo ya kuhamisha', Inspections: 'Ukaguzi', Weighbridge: 'Mizani', 'Vehicle keys': 'Funguo za magari',
  Units: 'Makontena na magari', Consignments: 'Shehena', 'Vessel calls': 'Meli zinazowasili', 'Manifest import': 'Kupakia manifesti',
  'Customs & exams': 'Forodha na ukaguzi', Holds: 'Vizuizi', 'Release orders': 'Hati za kutoa', Charges: 'Tozo', Invoices: 'Ankara',
  Cashier: 'Keshia', Refunds: 'Marejesho', Statements: 'Taarifa za akaunti', Tariffs: 'Viwango vya bei', Approvals: 'Idhini',
  Exceptions: 'Matatizo', Reports: 'Ripoti', 'Search container, VIN, plate, BL, invoice or customer': 'Tafuta kontena, VIN, namba ya gari, BL, ankara au mteja',
  'Working offline': 'Unafanya kazi bila mtandao', 'Ask Aiva': 'Muulize Aiva', Language: 'Lugha', 'Sign out': 'Toka',
};

export function useT() {
  const { lang } = useSession();
  return (s: string) => (lang === 'sw' ? SW[s] ?? s : s);
}
