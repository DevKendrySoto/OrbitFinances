export type Severity = 'info' | 'warning' | 'critical';

export const SEVERITY_VARIANT: Record<Severity, 'destructive' | 'default' | 'secondary'> = {
  critical: 'destructive',
  warning: 'default',
  info: 'secondary',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Riesgo alto',
  warning: 'Atención',
  info: 'Info',
};
