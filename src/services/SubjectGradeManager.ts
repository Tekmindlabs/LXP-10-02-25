import { PrismaClient, Prisma } from '@prisma/client';

interface Subject {
	id: string;
	name: string;
}

interface TermStructure {
	id: string;
	terms: Term[];
}

interface Term {
	id: string;
	name: string;
	assessmentPeriods: AssessmentPeriod[];
}

interface AssessmentPeriod {
	id: string;
	name: string;
}

interface GradeRecord {
	grade: number | null;
	status: 'PENDING' | 'COMPLETED';
}

interface ActivityGrade {
	activityId: string;
	grade: number;
}

interface AssessmentPeriodGrade extends GradeRecord {
	activities: ActivityGrade[];
}

type TermGrades = Record<string, GradeRecord>;
type AssessmentPeriodGrades = Record<string, AssessmentPeriodGrade>;

export class SubjectGradeManager {
	private db: PrismaClient;

	constructor(db: PrismaClient) {
		this.db = db;
	}

	async initializeSubjectGrades(
		gradeBookId: string,
		subject: Subject,
		termStructure: TermStructure
	): Promise<void> {
		const termGrades = this.createInitialTermGrades(termStructure);
		const assessmentPeriodGrades = this.createInitialAssessmentPeriodGrades(termStructure);

		await this.db.subjectGradeRecord.create({
			data: {
				gradeBookId,
				subjectId: subject.id,
				termGrades: JSON.stringify(termGrades) as unknown as Prisma.JsonValue,
				assessmentPeriodGrades: JSON.stringify(assessmentPeriodGrades) as unknown as Prisma.JsonValue
			}
		});
	}

	private createInitialTermGrades(termStructure: TermStructure): TermGrades {
		const termGrades: TermGrades = {};
		termStructure.terms.forEach(term => {
			termGrades[term.id] = {
				grade: null,
				status: 'PENDING'
			};
		});
		return termGrades;
	}

	private createInitialAssessmentPeriodGrades(termStructure: TermStructure): AssessmentPeriodGrades {
		const assessmentPeriodGrades: AssessmentPeriodGrades = {};
		termStructure.terms.forEach(term => {
			term.assessmentPeriods.forEach(period => {
				assessmentPeriodGrades[period.id] = {
					grade: null,
					status: 'PENDING',
					activities: []
				};
			});
		});
		return assessmentPeriodGrades;
	}

	async calculateAssessmentPeriodGrade(
		subjectId: string,
		assessmentPeriodId: string,
		studentId: string
	): Promise<number> {
		// Get all activity grades for this assessment period
		const grades = await this.db.grade.findMany({
			where: {
				assessmentPeriod: {
					id: assessmentPeriodId
				},
				studentProfile: {
					id: studentId
				},
				status: 'ACTIVE'
			},
			select: {
				value: true
			}
		});

		// Calculate average grade
		if (grades.length === 0) return 0;
		const sum = grades.reduce((acc, grade) => acc + grade.value, 0);
		return sum / grades.length;
	}
}