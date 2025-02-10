import { DefaultRoles } from "@/utils/permissions";

export type DashboardFeature =
  | 'system-metrics'
  | 'user-management'
  | 'role-management'
  | 'audit-logs'
  | 'advanced-settings'
  | 'class-management'
  | 'student-progress'
  | 'assignments'
  | 'grading'
  | 'academic-calendar'
  | 'timetable-management'
  | 'classroom-management'
  | 'class-activity-management'
  | 'knowledge-base';

export interface DashboardComponent<T = string> {
  component: T;
  gridArea?: string;
  className?: string;
}

export interface DashboardLayoutConfig<T = string> {
  type: 'complex' | 'simple';
  components: DashboardComponent<T>[];
}

export type DashboardLayoutType = Record<keyof typeof DefaultRoles, DashboardLayoutConfig>;