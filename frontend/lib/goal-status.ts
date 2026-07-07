export type GoalStatus = 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';

export const GOAL_STATUS_VARIANT: Record<GoalStatus, 'default' | 'secondary' | 'outline'> = {
  IN_PROGRESS: 'default',
  COMPLETED: 'secondary',
  PAUSED: 'outline',
};

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  IN_PROGRESS: 'En progreso',
  COMPLETED: 'Completada',
  PAUSED: 'Pausada',
};
