import { AttendanceTrackingMode, type AttendanceStatus } from '@/types/attendance';
import { Status } from '@prisma/client';

export interface ClassGroup {
	id: string;
	name: string;
	description: string | null;
	status: Status;
	calendarId: string;
	programId: string;
	createdAt: Date;
	updatedAt: Date;
	classes?: Array<{
		id: string;
		name: string;
	}>;
}

export interface StudentWithUser {
	id: string;
	user: {
		name: string | null;
		email: string | null;
	};
}

export interface AttendanceRecord {
	status: AttendanceStatus;
	notes?: string;
	subjectId?: string;
}

export interface AttendanceFormProps {
	selectedClass: string;
	selectedDate: Date;
	trackingMode: AttendanceTrackingMode;
	selectedSubject: string | null;
	attendanceData: Map<string, AttendanceRecord>;
	onAttendanceChange: (studentId: string, status: AttendanceStatus, notes?: string) => void;
	onSave: () => Promise<void>;
}