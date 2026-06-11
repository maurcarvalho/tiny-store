export const MODULE_SCHEMAS = ['orders', 'inventory', 'payments', 'shipments'] as const;
export type ModuleName = (typeof MODULE_SCHEMAS)[number];
