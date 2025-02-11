import { Status } from "@prisma/client";
import { AssessmentSystemType } from "@/types/assessment";

export interface Calendar {
	id: string;
	name: string;
}

export interface Coordinator {
	id: string;
	user: {
		name: string;
	};
}

export type TermSystemType = 'SEMESTER' | 'TERM' | 'QUARTER';

export interface ProgramFormData {
	name: string;
	description?: string;
	calendarId: string;
	coordinatorId?: string;
	status: Status;
	termSystem?: {
		type: TermSystemType;
		terms: Array<{
			name: string;
			startDate: Date;
			endDate: Date;
			type: TermSystemType;
			assessmentPeriods: Array<{
				name: string;
				startDate: Date;
				endDate: Date;
				weight: number;
			}>;
		}>;
	};
	assessmentSystem: {
		type: AssessmentSystemType;
		markingScheme?: {
			maxMarks: number;
			passingMarks: number;
			gradingScale: Array<{
				grade: string;
				minPercentage: number;
				maxPercentage: number;
			}>;
		};
		rubric?: {
			name: string;
			description?: string;
			criteria: Array<{
				name: string;
				description?: string;
				levels: Array<{
					name: string;
					points: number;
					description?: string;
				}>;
			}>;
		};
		cgpaConfig?: {
			gradePoints: Array<{
				grade: string;
				points: number;
				minPercentage: number;
				maxPercentage: number;
			}>;
			semesterWeightage: boolean;
			includeBacklogs: boolean;
		};
	};
}




export interface Program extends ProgramFormData {
	id: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface ProgramFormProps {
	selectedProgram?: Program;
	coordinators: Coordinator[];
	onSuccess: () => void;
}