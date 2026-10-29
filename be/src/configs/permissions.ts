// 59 official ICD permission codes checked against the database seed
export const ALL_PERMISSIONS = [
  'admin.site.manage', 'admin.yard.design', 'admin.gate.configure', 'admin.users.manage',
  'admin.roles.manage', 'admin.config.manage', 'admin.device.manage', 'admin.audit.view',
  'masters.view', 'masters.local.edit', 'manifest.import', 'consignment.view',
  'consignment.edit', 'gate.visit.checkin', 'gate.visit.checkout', 'gate.checkout.override',
  'gate.pass.print', 'weighbridge.ticket', 'weighbridge.override', 'inspection.perform',
  'inspection.damage.approve', 'yard.map.view', 'yard.allocate', 'yard.move.execute',
  'yard.move.override', 'yard.key.custody', 'customs.ref.edit', 'customs.hold.place',
  'customs.hold.lift', 'customs.exam.record', 'release.issue', 'release.exception.approve',
  'billing.rates.view', 'billing.invoice.view', 'billing.invoice.create', 'billing.invoice.post',
  'billing.creditnote', 'billing.waiver', 'billing.freeday.extend', 'billing.tariff.change',
  'payment.record', 'payment.cashup.approve', 'payment.refund', 'finance.period.close',
  'finance.exchange_rate.edit', 'finance.disbursement.record', 'dashboard.control_tower',
  'dashboard.executive', 'reports.operational', 'reports.financial', 'exception.view',
  'exception.manage', 'security.incident.manage', 'device.configure', 'integration.monitor',
  'portal.request.submit', 'portal.request.handle', 'portal.invite', 'appointment.manage',
  'appointment.book', 'cfs.job.manage', 'cfs.job.approve', 'reefer.manage', 'dg.manage',
  'repair.estimate', 'aiva.use'
] as const;

export type PermissionCode = typeof ALL_PERMISSIONS[number];

export type Grant = 'DO' | 'REQ' | 'APPR' | 'VIEW';

export interface RoleDef {
  code: string;
  name: string;
  external?: boolean;
  grants: Record<string, Grant>;
}

export const ROLES: Record<string, RoleDef> = {
  ALL_PERMISSIONS: {
    code: 'ALL_PERMISSIONS',
    name: 'Administrator (All Permissions)',
    grants: ALL_PERMISSIONS.reduce((acc, p) => ({ ...acc, [p]: 'DO' }), {})
  },
  ICD_ADMIN: {
    code: 'ICD_ADMIN',
    name: 'ICD administrator',
    grants: {
      'admin.site.manage': 'DO', 'admin.yard.design': 'DO', 'admin.gate.configure': 'DO',
      'admin.users.manage': 'DO', 'admin.roles.manage': 'DO', 'admin.config.manage': 'DO',
      'admin.device.manage': 'DO', 'admin.audit.view': 'VIEW', 'masters.view': 'VIEW',
      'masters.local.edit': 'DO', 'device.configure': 'DO', 'integration.monitor': 'DO',
      'portal.invite': 'DO', 'appointment.manage': 'DO', 'appointment.book': 'DO'
    }
  },
  GATE_OFFICER: {
    code: 'GATE_OFFICER',
    name: 'Gate officer',
    grants: {
      'gate.visit.checkin': 'DO', 'gate.visit.checkout': 'DO', 'gate.checkout.override': 'REQ',
      'gate.pass.print': 'DO', 'customs.hold.place': 'REQ', 'consignment.view': 'VIEW',
      'yard.map.view': 'VIEW', 'masters.view': 'VIEW', 'masters.local.edit': 'DO', 'aiva.use': 'DO',
      'appointment.manage': 'VIEW', 'appointment.book': 'DO'
    }
  },
  YARD_OFFICER: {
    code: 'YARD_OFFICER',
    name: 'Yard officer / planner',
    grants: {
      'yard.map.view': 'VIEW', 'yard.allocate': 'DO', 'yard.move.execute': 'DO',
      'yard.move.override': 'REQ', 'yard.key.custody': 'DO', 'customs.hold.place': 'REQ',
      'consignment.view': 'VIEW', 'aiva.use': 'DO', 'reefer.manage': 'DO', 'dg.manage': 'DO'
    }
  },
  EQUIPMENT_OPERATOR: {
    code: 'EQUIPMENT_OPERATOR',
    name: 'Equipment operator',
    grants: { 'yard.move.execute': 'DO', 'yard.map.view': 'VIEW' }
  },
  INSPECTION_OFFICER: {
    code: 'INSPECTION_OFFICER',
    name: 'Inspection officer',
    grants: {
      'inspection.perform': 'DO', 'customs.hold.place': 'REQ', 'yard.map.view': 'VIEW',
      'consignment.view': 'VIEW', 'repair.estimate': 'DO', 'dg.manage': 'DO'
    }
  },
  WEIGHBRIDGE_OFFICER: {
    code: 'WEIGHBRIDGE_OFFICER',
    name: 'Weighbridge officer',
    grants: { 'weighbridge.ticket': 'DO', 'weighbridge.override': 'REQ' }
  },
  DOC_CLEARANCE: {
    code: 'DOC_CLEARANCE',
    name: 'Documentation & clearance officer',
    grants: {
      'manifest.import': 'DO', 'consignment.edit': 'DO', 'consignment.view': 'VIEW',
      'customs.ref.edit': 'DO', 'customs.hold.place': 'DO', 'customs.hold.lift': 'REQ',
      'customs.exam.record': 'DO', 'release.issue': 'DO', 'billing.creditnote': 'REQ',
      'billing.waiver': 'REQ', 'billing.freeday.extend': 'REQ', 'billing.invoice.view': 'VIEW',
      'exception.manage': 'DO', 'masters.view': 'VIEW', 'masters.local.edit': 'DO',
      'aiva.use': 'DO', 'dg.manage': 'DO', 'portal.request.handle': 'DO'
    }
  },
  CFS_SUPERVISOR: {
    code: 'CFS_SUPERVISOR',
    name: 'CFS field supervisor',
    grants: {
      'inspection.perform': 'DO', 'yard.map.view': 'VIEW', 'consignment.view': 'VIEW', 'cfs.job.manage': 'DO'
    }
  },
  BILLING_OFFICER: {
    code: 'BILLING_OFFICER',
    name: 'Billing officer',
    grants: {
      'billing.rates.view': 'VIEW', 'billing.invoice.view': 'VIEW', 'billing.invoice.create': 'DO',
      'billing.invoice.post': 'DO', 'billing.creditnote': 'REQ', 'billing.waiver': 'REQ',
      'billing.tariff.change': 'REQ', 'finance.disbursement.record': 'DO', 'consignment.view': 'VIEW',
      'reports.financial': 'VIEW', 'aiva.use': 'DO'
    }
  },
  CASHIER: {
    code: 'CASHIER',
    name: 'Cashier',
    grants: { 'payment.record': 'DO', 'billing.invoice.view': 'VIEW' }
  },
  FINANCE_MANAGER: {
    code: 'FINANCE_MANAGER',
    name: 'Finance manager',
    grants: {
      'billing.creditnote': 'APPR', 'billing.waiver': 'APPR', 'billing.freeday.extend': 'APPR',
      'billing.tariff.change': 'APPR', 'payment.cashup.approve': 'APPR', 'payment.refund': 'APPR',
      'finance.period.close': 'DO', 'finance.exchange_rate.edit': 'DO', 'finance.disbursement.record': 'DO',
      'billing.invoice.view': 'VIEW', 'billing.rates.view': 'VIEW', 'reports.financial': 'VIEW',
      'dashboard.executive': 'VIEW', 'aiva.use': 'DO'
    }
  },
  OPS_MANAGER: {
    code: 'OPS_MANAGER',
    name: 'Operations manager / depot supervisor',
    grants: {
      'gate.checkout.override': 'APPR', 'customs.hold.lift': 'APPR', 'release.exception.approve': 'APPR',
      'inspection.damage.approve': 'APPR', 'yard.move.override': 'APPR', 'weighbridge.override': 'APPR',
      'billing.freeday.extend': 'REQ', 'billing.waiver': 'REQ', 'billing.creditnote': 'REQ',
      'exception.manage': 'DO', 'exception.view': 'VIEW', 'dashboard.control_tower': 'VIEW',
      'reports.operational': 'VIEW', 'yard.map.view': 'VIEW', 'consignment.view': 'VIEW',
      'billing.invoice.view': 'VIEW', 'admin.audit.view': 'VIEW', 'admin.yard.design': 'VIEW',
      'aiva.use': 'DO', 'cfs.job.approve': 'APPR', 'appointment.manage': 'DO',
      'integration.monitor': 'VIEW'
    }
  },
  CUSTOMER_SERVICE: {
    code: 'CUSTOMER_SERVICE',
    name: 'Customer service',
    grants: {
      'consignment.view': 'VIEW', 'billing.invoice.view': 'VIEW', 'yard.map.view': 'VIEW',
      'exception.view': 'VIEW', 'masters.view': 'VIEW', 'aiva.use': 'DO',
      'portal.request.handle': 'DO', 'portal.invite': 'DO'
    }
  },
  SECURITY_OFFICER: {
    code: 'SECURITY_OFFICER',
    name: 'Security officer',
    grants: {
      'security.incident.manage': 'DO', 'exception.view': 'VIEW', 'admin.audit.view': 'VIEW',
      'yard.map.view': 'VIEW'
    }
  },
  MANAGEMENT: {
    code: 'MANAGEMENT',
    name: 'Management (read-only)',
    grants: {
      'dashboard.executive': 'VIEW', 'dashboard.control_tower': 'VIEW',
      'reports.operational': 'VIEW', 'reports.financial': 'VIEW', 'aiva.use': 'DO'
    }
  },
  AUDITOR: {
    code: 'AUDITOR',
    name: 'Auditor (read-only)',
    grants: {
      'admin.audit.view': 'VIEW', 'reports.operational': 'VIEW', 'reports.financial': 'VIEW',
      'billing.invoice.view': 'VIEW', 'consignment.view': 'VIEW', 'billing.rates.view': 'VIEW'
    }
  },
  CUSTOMS_OFFICER: {
    code: 'CUSTOMS_OFFICER',
    name: 'Customs officer (restricted)',
    grants: {
      'customs.ref.edit': 'DO', 'customs.hold.place': 'DO', 'customs.hold.lift': 'DO',
      'customs.exam.record': 'DO', 'consignment.view': 'VIEW'
    }
  },
  AGENT_PORTAL: {
    code: 'AGENT_PORTAL',
    name: 'Clearing agent (portal)',
    external: true,
    grants: {
      'consignment.view': 'VIEW', 'billing.invoice.view': 'VIEW', 'portal.request.submit': 'DO',
      'appointment.book': 'DO', 'aiva.use': 'DO'
    }
  },
  CUSTOMER_PORTAL: {
    code: 'CUSTOMER_PORTAL',
    name: 'Customer (portal)',
    external: true,
    grants: { 'consignment.view': 'VIEW', 'billing.invoice.view': 'VIEW', 'portal.request.submit': 'DO' }
  }
};

