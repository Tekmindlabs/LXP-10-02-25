import { AttendanceStatus } from '@prisma/client';

export interface StudentWithUser {
	id: string;
	user: {
		id: string;
		name: string | null;
	};
}

export interface AttendanceRecord {
	status: AttendanceStatus;
	notes?: string;
}

export interface AttendanceSubmission {
	studentId: string;
	status: AttendanceStatus;
	notes?: string;
}
