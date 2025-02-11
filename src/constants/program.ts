import { Status } from "@prisma/client";
import { AssessmentSystemType } from "@/types/assessment";
import { TermSystemType, ProgramFormData } from "@/types/program";

export const termConfigs: Record<TermSystemType, { terms: Array<{ name: string }> }> = {
	SEMESTER: {
		terms: [
			{ name: 'Semester 1' },
			{ name: 'Semester 2' }
		]
	},
	TERM: {
		terms: [
			{ name: 'Term 1' },
			{ name: 'Term 2' },
			{ name: 'Term 3' }
		]
	},
	QUARTER: {
		terms: [
			{ name: 'Quarter 1' },
			{ name: 'Quarter 2' },
			{ name: 'Quarter 3' },
			{ name: 'Quarter 4' }
		]
	}
};

export const defaultCGPAConfig = {
	gradePoints: [
		{ grade: 'A+', points: 4.0, minPercentage: 90, maxPercentage: 100 },
		{ grade: 'A', points: 3.7, minPercentage: 85, maxPercentage: 89 },
		{ grade: 'A-', points: 3.3, minPercentage: 80, maxPercentage: 84 },
		{ grade: 'B+', points: 3.0, minPercentage: 75, maxPercentage: 79 },
		{ grade: 'B', points: 2.7, minPercentage: 70, maxPercentage: 74 },
		{ grade: 'C+', points: 2.3, minPercentage: 65, maxPercentage: 69 },
		{ grade: 'C', points: 2.0, minPercentage: 60, maxPercentage: 64 },
		{ grade: 'D', points: 1.0, minPercentage: 50, maxPercentage: 59 },
		{ grade: 'F', points: 0.0, minPercentage: 0, maxPercentage: 49 }
	],
	semesterWeightage: false,
	includeBacklogs: false
};

export const defaultRubric = {
	name: 'Default Rubric',
	description: '',
	criteria: [
		{
			name: 'Quality',
			description: '',
			levels: [
				{ name: 'Excellent', points: 4, description: '' },
				{ name: 'Good', points: 3, description: '' },
				{ name: 'Fair', points: 2, description: '' },
				{ name: 'Poor', points: 1, description: '' }
			]
		}
	]
};

export const defaultFormData: ProgramFormData = {
	name: "",
	description: "",
	calendarId: "NO_SELECTION",
	coordinatorId: "NO_SELECTION",
	status: Status.ACTIVE,
	termSystem: {
		type: "SEMESTER",
		terms: termConfigs.SEMESTER.terms.map(term => ({
			name: term.name,
			startDate: new Date(),
			endDate: new Date(),
			type: "SEMESTER",
			assessmentPeriods: []
		}))
	},
	assessmentSystem: {
		type: AssessmentSystemType.MARKING_SCHEME,
		markingScheme: {
			maxMarks: 100,
			passingMarks: 40,
			gradingScale: [
				{ grade: 'A', minPercentage: 80, maxPercentage: 100 },
				{ grade: 'B', minPercentage: 70, maxPercentage: 79 },
				{ grade: 'C', minPercentage: 60, maxPercentage: 69 },
				{ grade: 'D', minPercentage: 50, maxPercentage: 59 },
				{ grade: 'E', minPercentage: 40, maxPercentage: 49 },
				{ grade: 'F', minPercentage: 0, maxPercentage: 39 }
			]
		}
	}
};