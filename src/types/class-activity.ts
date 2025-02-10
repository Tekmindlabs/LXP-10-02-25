export enum ActivityType {
	// Online Activities
	QUIZ_MULTIPLE_CHOICE = 'QUIZ_MULTIPLE_CHOICE',
	QUIZ_DRAG_DROP = 'QUIZ_DRAG_DROP',
	QUIZ_FILL_BLANKS = 'QUIZ_FILL_BLANKS',
	QUIZ_MEMORY = 'QUIZ_MEMORY',
	QUIZ_TRUE_FALSE = 'QUIZ_TRUE_FALSE',
	GAME_WORD_SEARCH = 'GAME_WORD_SEARCH',
	GAME_CROSSWORD = 'GAME_CROSSWORD',
	GAME_FLASHCARDS = 'GAME_FLASHCARDS',
	VIDEO_YOUTUBE = 'VIDEO_YOUTUBE',
	READING = 'READING',
	// In-Class Activities
	CLASS_ASSIGNMENT = 'CLASS_ASSIGNMENT',
	CLASS_PROJECT = 'CLASS_PROJECT',
	CLASS_PRESENTATION = 'CLASS_PRESENTATION',
	CLASS_TEST = 'CLASS_TEST',
	CLASS_EXAM = 'CLASS_EXAM'
}

export enum ActivityMode {
	ONLINE = 'ONLINE',
	IN_CLASS = 'IN_CLASS'
}

export enum ActivityStatus {
	DRAFT = 'DRAFT',
	PUBLISHED = 'PUBLISHED',
	ARCHIVED = 'ARCHIVED'
}

export enum ActivityGradingType {
	AUTOMATIC = 'AUTOMATIC',
	MANUAL = 'MANUAL'
}

export enum ActivityViewType {
	PREVIEW = 'PREVIEW',
	STUDENT = 'STUDENT',
	CONFIGURATION = 'CONFIGURATION'
}

export enum ActivityResourceType {
	DOCUMENT = 'DOCUMENT',
	VIDEO = 'VIDEO',
	AUDIO = 'AUDIO',
	LINK = 'LINK',
	IMAGE = 'IMAGE'
}

export enum ActivitySubmissionStatus {
	PENDING = 'PENDING',
	SUBMITTED = 'SUBMITTED',
	GRADED = 'GRADED',
	LATE = 'LATE',
	MISSED = 'MISSED'
}

export interface ActivityConfiguration {
	activityMode: ActivityMode;
	isGraded: boolean;
	totalMarks: number;
	passingMarks: number;
	gradingType: ActivityGradingType;
	availabilityDate: Date;
	deadline: Date;
	instructions?: string;
	timeLimit?: number;
	attempts?: number;
	viewType: ActivityViewType;
	autoGradingConfig?: {
		scorePerQuestion: number;
		penaltyPerWrongAnswer: number;
		allowPartialCredit: boolean;
	};
}

export interface ActivityResource {
	id?: string;
	title: string;
	type: ActivityResourceType;
	url: string;
	fileInfo?: {
		size: number;
		createdAt: Date;
		updatedAt: Date;
		mimeType: string;
		publicUrl: string;
	};
}

export interface ActivitySubmission {
	id: string;
	activityId: string;
	studentId: string;
	status: ActivitySubmissionStatus;
	submittedAt: Date;
	content?: any;
	obtainedMarks?: number;
	totalMarks?: number;
	feedback?: string;
	isPassing: boolean;
	gradingType: ActivityGradingType;
	gradedBy?: string;
	gradedAt?: Date;
}

export interface ActivityCalendar {
	id: string;
	inheritSettings: boolean;
}

export interface ClassActivity {
	id: string;
	title: string;
	description?: string;
	type: ActivityType;
	status: ActivityStatus;
	classId?: string;
	subjectId: string;
	subjects?: Array<{ id: string; name: string }>;
	classGroupId?: string;
	calendarId?: string;
	deadline?: Date;
	configuration: ActivityConfiguration;
	resources?: ActivityResource[];
	submissions?: ActivitySubmission[];
	createdAt: Date;
	updatedAt: Date;
	class?: { name: string };
	subject: { name: string };
	classGroup?: { 
		name: string;
		calendar?: {
			id: string;
			inheritSettings?: boolean;
		};
	};
}

export interface ActivityWithBasicSubmissions extends ClassActivity {
	submissions?: Array<{
		id: string;
		status: ActivitySubmissionStatus;
		submittedAt: Date;
		student: {
			id: string;
			name: string | null;
		};
	}>;
}

export type FormData = {
	title: string;
	description?: string;
	type: ActivityType;
	classId?: string;
	subjectId: string;
	subjectIds?: string[];
	classGroupId?: string;
	calendar?: ActivityCalendar;
	configuration: ActivityConfiguration;
	resources?: ActivityResource[];
};
