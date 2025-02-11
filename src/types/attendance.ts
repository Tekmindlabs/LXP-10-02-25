import { z } from "zod";

export enum AttendanceStatus {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",
  LATE = "LATE",
  EXCUSED = "EXCUSED"
}

export enum AttendanceTrackingMode {
  CLASS = "CLASS",
  SUBJECT = "SUBJECT",
  BOTH = "BOTH"
}

export const attendanceSchema = z.object({
  studentId: z.string(),
  status: z.enum([
    AttendanceStatus.PRESENT,
    AttendanceStatus.ABSENT,
    AttendanceStatus.LATE,
    AttendanceStatus.EXCUSED
  ]),
  date: z.date(),
  classId: z.string(),
  subjectId: z.string().optional(),
  notes: z.string().optional()
});

export type AttendanceRecord = z.infer<typeof attendanceSchema>;

export interface SubjectAttendanceStats {
  subjectId: string;
  subjectName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

export interface AttendanceStatsData {
  todayStats: {
    present: number;
    absent: number;
    total: number;
  };
  weeklyPercentage: number;
  mostAbsentStudents: Array<{
    name: string;
    absences: number;
  }>;
  lowAttendanceClasses: Array<{
    name: string;
    percentage: number;
  }>;
  subjectStats?: SubjectAttendanceStats[];
}

export interface AttendanceDashboardData {
  attendanceTrend: Array<{
    date: string;
    percentage: number;
  }>;
  classAttendance: Array<{
    className: string;
    present: number;
    absent: number;
    percentage: number;
    subjectAttendance?: SubjectAttendanceStats[];
  }>;
}

export interface AttendanceSettings {
  trackingMode: AttendanceTrackingMode;
  defaultMode: 'CLASS' | 'SUBJECT';
  subjectWiseEnabled: boolean;
}
