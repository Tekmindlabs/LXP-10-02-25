import { z } from "zod";

// Add helper functions for time format conversion
export const formatTimeString = (time: Date | string): string => {
	if (time instanceof Date) {
		return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
	return time;
};

export const parseTimeString = (time: string | Date): Date => {
	if (time instanceof Date) return time;
	return new Date(`1970-01-01T${time}`);
};

export const breakTimeSchema = z.object({
	startTime: z.string(), // HH:mm format
	endTime: z.string(),
	type: z.enum(["SHORT_BREAK", "LUNCH_BREAK"]),
	dayOfWeek: z.number().min(1).max(7)
});

// Add a type for consistent period handling
export interface NormalizedPeriod extends Omit<PeriodInput, 'startTime' | 'endTime'> {
	startTime: Date;
	endTime: Date;
}

export const periodInputSchema = z.object({
	id: z.string().optional(),
	startTime: z.union([z.string(), z.date()], {
		required_error: "Start time is required",
		invalid_type_error: "Invalid start time format"
	}).transform(time => {
		if (typeof time === 'string') {
			return new Date(`1970-01-01T${time}`);
		}
		return time;
	}),
	endTime: z.union([z.string(), z.date()], {
		required_error: "End time is required",
		invalid_type_error: "Invalid end time format"
	}).transform(time => {
		if (typeof time === 'string') {
			return new Date(`1970-01-01T${time}`);
		}
		return time;
	}),
	daysOfWeek: z.array(z.number().min(1).max(7))
		.min(1, "Select at least one day")
		.refine((days) => days.length > 0, "At least one day must be selected"),
	subjectId: z.string({
		required_error: "Subject is required",
		invalid_type_error: "Invalid subject selection"
	}).min(1, "Subject is required"),
	teacherId: z.string({
		required_error: "Teacher is required",
		invalid_type_error: "Invalid teacher selection"
	}).min(1, "Teacher is required"),
	classroomId: z.string({
		required_error: "Classroom is required",
		invalid_type_error: "Invalid classroom selection"
	}).min(1, "Classroom is required"),
	durationInMinutes: z.number().default(45),
	timetableId: z.string()
}).refine(
	(data) => {
		const start = data.startTime instanceof Date ? data.startTime : parseTimeString(data.startTime);
		const end = data.endTime instanceof Date ? data.endTime : parseTimeString(data.endTime);
		return start < end;
	},
	{
		message: "End time must be after start time",
		path: ["endTime"]
	}
);

export const timetableInputSchema = z.object({
	termId: z.string(),
	classGroupId: z.string(),
	classId: z.string(),
	academicCalendarId: z.string(),
	startTime: z.string(), // Daily start time HH:mm
	endTime: z.string(), // Daily end time HH:mm
	breakTimes: z.array(breakTimeSchema),
	periods: z.array(periodInputSchema)
});

export type BreakTime = z.infer<typeof breakTimeSchema>;

export interface ServerBreakTime extends Omit<BreakTime, 'type'> {
	id: string;
	type: string;
	timetableId: string;
	createdAt: Date;
	updatedAt: Date;
}

export const isServerBreakTime = (breakTime: BreakTime | ServerBreakTime): breakTime is ServerBreakTime => {
	return 'id' in breakTime && 'timetableId' in breakTime;
};

export const normalizeBreakTime = (breakTime: BreakTime | ServerBreakTime): BreakTime => {
	if (isServerBreakTime(breakTime)) {
		return {
			startTime: breakTime.startTime,
			endTime: breakTime.endTime,
			type: breakTime.type as "SHORT_BREAK" | "LUNCH_BREAK",
			dayOfWeek: breakTime.dayOfWeek
		};
	}
	return breakTime;
};

export type PeriodInput = z.infer<typeof periodInputSchema>;
export type TimetableInput = z.infer<typeof timetableInputSchema>;

export interface TimetableWithCalendar extends TimetableInput {
    academicCalendarId: string;
    validateAgainstCalendar: () => Promise<boolean>;
}

export const isTimeOverlapping = (
    start1: string,
    end1: string,
    start2: string,
    end2: string
): boolean => {
    return start1 < end2 && end1 > start2;
};

export interface ScheduleConflict {
	type: 'TEACHER' | 'CLASSROOM' | 'BREAK_TIME';
	details: {
		startTime: string;
		endTime: string;
		dayOfWeek: number;
		entityId: string;
		additionalInfo?: string;
	};
}

export interface AvailabilityCheck {
	isAvailable: boolean;
	conflicts: ScheduleConflict[];
}