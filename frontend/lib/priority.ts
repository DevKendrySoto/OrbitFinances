export type Priority = 'CRITICAL' | 'IMPORTANT' | 'OPTIONAL';

export const PRIORITY_VARIANT: Record<Priority, 'destructive' | 'default' | 'secondary'> = {
  CRITICAL: 'destructive',
  IMPORTANT: 'default',
  OPTIONAL: 'secondary',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  CRITICAL: 'Crítico',
  IMPORTANT: 'Importante',
  OPTIONAL: 'Opcional',
};
