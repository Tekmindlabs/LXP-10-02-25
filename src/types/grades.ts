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

export interface SubjectAssessmentConfig {
    subjectId: string;
    weightageDistribution: {
        assignments: number;
        quizzes: number;
        exams: number;
        projects: number;
    };
    passingCriteria: {
        minPercentage: number;
        requiredAssessments: string[];
        minAttendance?: number;
    };
    gradeScale?: {
        A: { min: number; max: number; points: number; };
        B: { min: number; max: number; points: number; };
        C: { min: number; max: number; points: number; };
        D: { min: number; max: number; points: number; };
        F: { min: number; max: number; points: number; };
    };
}

export interface GradeHistoryEntry {
    id: string;
    studentId: string;
    subjectId: string;
    assessmentId: string;
    previousValue: number;
    newValue: number;
    modifiedBy: string;
    modifiedAt: Date;
    reason: string;
    metadata: Record<string, any>;
}

export interface BatchProcessingConfig {
    batchSize: number;
    retryAttempts: number;
    timeoutMs: number;
}

export interface GradeValidationResult {
    isValid: boolean;
    errors: {
        code: string;
        message: string;
        field?: string;
    }[];
}