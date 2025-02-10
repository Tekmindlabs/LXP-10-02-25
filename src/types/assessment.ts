export interface AssessmentSystem {
	id?: string;
	name: string;
	description?: string;
	type: AssessmentSystemType;
	programId: string;
}

export enum AssessmentSystemType {
	MARKING_SCHEME = 'MARKING_SCHEME',
	RUBRIC = 'RUBRIC',
	HYBRID = 'HYBRID'
}

export interface MarkingScheme {
	id?: string;
	name: string;
	maxMarks: number;
	passingMarks: number;
	assessmentSystemId: string;
	gradingScale: GradingScale[];
}

export interface GradingScale {
	grade: string;
	minPercentage: number;
	maxPercentage: number;
}

export interface Rubric {
	id?: string;
	name: string;
	description?: string;
	assessmentSystemId: string;
	criteria: RubricCriteria[];
}

export interface RubricCriteria {
	name: string;
	description?: string;
	levels: RubricLevel[];
}

export interface RubricLevel {
	name: string;
	description?: string;
	points: number;
}

export interface Assessment {
	id?: string;
	title: string;
	description?: string;
	type: AssessmentType;
	totalPoints: number;
	markingSchemeId?: string;
	rubricId?: string;
}

export enum AssessmentType {
	QUIZ = 'QUIZ',
	ASSIGNMENT = 'ASSIGNMENT',
	PROJECT = 'PROJECT',
	EXAM = 'EXAM',
	PRESENTATION = 'PRESENTATION'
}

export interface AssessmentSubmission {
	id?: string;
	assessmentId: string;
	studentId: string;
	obtainedMarks?: number;
	percentage?: number;
	grade?: string;
	rubricScores?: Record<string, number>;
	totalScore?: number;
	feedback?: string;
	status: SubmissionStatus;
	submittedAt?: Date;
	gradedAt?: Date;
}

export enum SubmissionStatus {
	PENDING = 'PENDING',
	SUBMITTED = 'SUBMITTED',
	GRADED = 'GRADED',
	LATE = 'LATE',
	MISSED = 'MISSED'
}