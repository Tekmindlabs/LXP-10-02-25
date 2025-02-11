export interface InheritanceSettings {
	propagateToChildren: boolean;
	overrideParentSettings: boolean;
}

export interface CalendarEvent {
	id: string;
	title: string;
	description?: string;
	startDate: Date;
	endDate: Date;
	level: 'class' | 'class_group';
	calendarId: string;
	programId?: string;
	classGroupId?: string;
	classId?: string;
	status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
	createdAt: Date;
	updatedAt: Date;
	inheritanceSettings?: InheritanceSettings;
}

export interface TimetablePeriod {
	id: string;
	startTime: Date;
	endTime: Date;
	durationInMinutes: number;
	dayOfWeek: number;
	subjectId: string;
	classroomId: string;
	timetableId: string;
	teacherId: string;
}

export interface ClassroomSchedule {
    id: string;
    startTime: Date;
    endTime: Date;
    dayOfWeek: number;
    subject: {
        id: string;
        name: string;
    };
    timetable: {
        id: string;
        class?: {
            id: string;
            name: string;
        };
        classGroup?: {
            id: string;
            name: string;
        };
    };
}

export interface ClassroomAvailability {
    date: Date;
    periods: ClassroomSchedule[];
}

export type CalendarViewMode = 'day' | 'week' | 'month';

export type ClassroomViewMode = 'daily' | 'weekly';

export type EntityType = 'class' | 'class_group' | 'timetable';