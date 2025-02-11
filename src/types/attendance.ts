import { AttendanceStatus } from '@prisma/client';
import { z } from "zod";


export enum AttendanceTrackingMode {
  CLASS = "CLASS",
  SUBJECT = "SUBJECT",
  BOTH = "BOTH"
}

// Enhanced attendance schema with better validation
export const attendanceSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  status: z.nativeEnum(AttendanceStatus),

  date: z.date(),
  classId: z.string().min(1, "Class ID is required"),
  subjectId: z.string().optional(),
  notes: z.string().optional()
}).refine((data) => {
  if (data.status === AttendanceStatus.EXCUSED && !data.notes) {
    return false;
  }
  return true;
}, {
  message: "Notes are required when status is EXCUSED",
  path: ["notes"]
});

export type AttendanceRecord = z.infer<typeof attendanceSchema>;

// Bulk operations schema
export const bulkAttendanceSchema = z.object({
  date: z.date(),
  classId: z.string().min(1, "Class ID is required"),
  subjectId: z.string().optional(),
  students: z.array(z.object({
    studentId: z.string().min(1, "Student ID is required"),
    status: z.nativeEnum(AttendanceStatus),

    notes: z.string().optional()
  }))
});

export type BulkAttendanceUpdate = z.infer<typeof bulkAttendanceSchema>;

// Audit logging interface
export interface AttendanceAudit {
  id: string;
  attendanceId: string;
  modifiedBy: string;
  modifiedAt: Date;
  oldValue: AttendanceStatus;
  newValue: AttendanceStatus;
  reason?: string;
  metadata?: Record<string, unknown>;
}

// Enhanced reporting interfaces
export interface AttendanceReport {
  period: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate: Date;
  endDate: Date;
  classId: string;
  subjectId?: string;
  stats: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
    trend: Array<{
      date: string;
      status: Record<AttendanceStatus, number>;
    }>;
  };
  studentDetails: Array<{
    studentId: string;
    name: string;
    attendance: {
      present: number;
      absent: number;
      late: number;
      excused: number;
      percentage: number;
    };
  }>;
}

export interface SubjectAttendanceStats {
  subjectId: string;
  subjectName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  trend?: Array<{
    date: string;
    percentage: number;
  }>;
}

export interface AttendanceStatsData {
  todayStats: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    percentage: number;
  };
  weeklyPercentage: number;
  mostAbsentStudents: Array<{
    name: string;
    absences: number;
    consecutiveAbsences: number;
    lastAttendance?: Date;
  }>;
  lowAttendanceClasses: Array<{
    name: string;
    percentage: number;
    trend?: Array<{
      date: string;
      percentage: number;
    }>;
  }>;
  subjectStats?: SubjectAttendanceStats[];
}

export interface AttendanceDashboardData {
  attendanceTrend: Array<{
    date: string;
    percentage: number;
    breakdown: Record<AttendanceStatus, number>;
  }>;
  classAttendance: Array<{
    className: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
    subjectAttendance?: SubjectAttendanceStats[];
  }>;
}

export interface AttendanceSettings {
  trackingMode: AttendanceTrackingMode;
  defaultMode: 'CLASS' | 'SUBJECT';
  subjectWiseEnabled: boolean;
}

export const defaultAttendanceSettings: AttendanceSettings = {
  trackingMode: AttendanceTrackingMode.CLASS,
  defaultMode: 'CLASS',
  subjectWiseEnabled: false

};

// Cache configuration
export interface CacheConfig {
  enabled: boolean;
  duration: number; // in milliseconds
  keys: {
    stats: string;
    dashboard: string;
    reports: string;
  };
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}
