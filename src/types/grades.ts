import { AssessmentSystemType } from '@prisma/client';

export interface SubjectTermGrade {
	termId: string;
	periodGrades: Record<string, AssessmentPeriodGrade>;
	finalGrade: number;
	totalMarks: number;
	percentage: number;
	isPassing: boolean;
	gradePoints: number;
	credits: number;
}

export interface AssessmentPeriodGrade {
	periodId: string;
	obtainedMarks: number;
	totalMarks: number;
	percentage: number;
	weight: number;
	isPassing: boolean;
	gradePoints?: number;
}

export interface CumulativeGrade {
	gpa: number;
	totalCredits: number;
	earnedCredits: number;
	subjectGrades: Record<string, SubjectTermGrade>;
}