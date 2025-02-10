import { Status } from "@prisma/client";

export enum TermSystemType {
	SEMESTER = 'SEMESTER',
	TERM = 'TERM',
	QUARTER = 'QUARTER'
}

export interface TermAssessmentPeriod {
	name: string;
	startDate: Date;
	endDate: Date;
	weight: number;
}

export interface AcademicTerm {
	name: string;
	startDate: Date;
	endDate: Date;
	type: TermSystemType;
	assessmentPeriods: TermAssessmentPeriod[];
}

export interface TermSystem {
	type: TermSystemType;
	terms: AcademicTerm[];
}

export interface Program {
	id: string;
	name: string;
	description?: string;
	status: Status;
	termSystem: TermSystemType;
	coordinator?: {
		user: {
			name: string;
		};
	};
	calendar: {
		name: string;
	};
	classGroups: any[];
	assessmentSystem?: AssessmentSystem;
	termStructures?: Array<{
		id: string;
		name: string;
		startDate: Date;
		endDate: Date;
		academicTerms: Array<{
			name: string;
			startDate: Date;
			endDate: Date;
		}>;
	}>;
}



export interface CGPAGradePoint {
	grade: string;
	points: number;
	minPercentage: number;
	maxPercentage: number;
}

export interface CGPAConfig {
	gradePoints: CGPAGradePoint[];
	semesterWeightage: boolean;
	includeBacklogs: boolean;
}

export interface AssessmentSystem {
	id?: string;
	name: string;
	description?: string;
	type: AssessmentSystemType;
	programId: string;
	cgpaConfig?: CGPAConfig;
	termSystem?: TermSystem;
}

export enum AssessmentSystemType {
	MARKING_SCHEME = 'MARKING_SCHEME',
	RUBRIC = 'RUBRIC',
	HYBRID = 'HYBRID',
	CGPA = 'CGPA'
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