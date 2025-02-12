import { PrismaClient, ActivitySubmission, MarkingScheme, Rubric, AssessmentSystem, Prisma } from '@prisma/client';
import { AssessmentService } from './AssessmentService';
import { SubjectAssessmentConfig } from '../../types/grades';


interface AssessmentPeriodGrade {
	periodId: string;
	obtainedMarks: number;
	totalMarks: number;
	percentage: number;
	weight: number;
	isPassing: boolean;
	gradePoints?: number;
}

interface SubjectTermGrade {
	termId: string;
	periodGrades: Record<string, AssessmentPeriodGrade>;
	finalGrade: number;
	totalMarks: number;
	percentage: number;
	isPassing: boolean;
	gradePoints: number;
	credits: number;
}

export class SubjectGradeManager {
	private assessmentService: AssessmentService;

	constructor(private db: PrismaClient) {
		this.assessmentService = new AssessmentService(db);
	}

	async calculateAssessmentPeriodGrade(
		subjectId: string,
		periodId: string,
		studentId: string,
		assessmentSystemId: string,
		config: SubjectAssessmentConfig
	): Promise<AssessmentPeriodGrade> {
		const period = await this.db.termAssessmentPeriod.findUnique({
			where: { id: periodId }
		});

		const submissions = await this.getSubmissionsForPeriod(subjectId, periodId, studentId);
		let totalWeightedScore = 0;
		let totalWeight = 0;

		for (const submission of submissions) {
			const assessment = await this.assessmentService.getAssessmentForActivity(submission.activityId);
			if (!assessment) continue;

			const weight = this.getAssessmentWeight(assessment.type, config.weightageDistribution);
			const percentage = await this.calculateSubmissionPercentage(submission, assessment);
			
			totalWeightedScore += percentage * weight;
			totalWeight += weight;
		}

		const finalPercentage = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
		const gradePoints = await this.assessmentService.calculateGPA(finalPercentage, assessmentSystemId);
		const isPassing = this.checkPassingCriteria(finalPercentage, submissions, config);

		return {
			periodId,
			obtainedMarks: totalWeightedScore,
			totalMarks: totalWeight * 100,
			percentage: finalPercentage,
			weight: period?.weight || 0,
			isPassing,
			gradePoints
		};

	}

	async calculateSubjectTermGrade(
		subjectId: string,
		termId: string,
		studentId: string,
		assessmentSystemId: string
	): Promise<SubjectTermGrade> {
		const periods = await this.db.termAssessmentPeriod.findMany({
			where: { termId }
		});

		const periodGrades: Record<string, AssessmentPeriodGrade> = {};
		let weightedTotal = 0;
		let weightSum = 0;

		for (const period of periods) {
			const grade = await this.calculateAssessmentPeriodGrade(
				subjectId,
				period.id,
				studentId,
				assessmentSystemId
			);
			periodGrades[period.id] = grade;
			weightedTotal += (grade.percentage * grade.weight);
			weightSum += grade.weight;
		}

		const finalPercentage = weightSum > 0 ? weightedTotal / weightSum : 0;

		const totalMarks = Object.values(periodGrades).reduce((sum, grade) => sum + grade.totalMarks, 0);
		const gradePoints = await this.assessmentService.calculateGPA(finalPercentage, assessmentSystemId);
		const subject = await this.db.subject.findUnique({ where: { id: subjectId } });

		return {
			termId,
			periodGrades,
			finalGrade: finalPercentage,
			totalMarks,
			percentage: finalPercentage,
			isPassing: finalPercentage >= 50,
			gradePoints,
			credits: subject?.credits || 0
		};
	}

	async initializeSubjectGrades(
		gradeBookId: string,
		subject: any,
		termStructure: any
	): Promise<void> {
		const assessmentPeriods = await this.getAssessmentPeriods(termStructure);
		
		await this.db.subjectGradeRecord.create({
			data: {
				gradeBookId,
				subjectId: subject.id,
				termGrades: this.initializeTermGrades(termStructure.academicTerms),
				assessmentPeriodGrades: this.initializeAssessmentPeriodGrades(assessmentPeriods)
			}
		});
	}

	private async getAssessmentPeriods(termStructure: any): Promise<any[]> {
		return termStructure.academicTerms.flatMap((term: any) => term.assessmentPeriods);
	}

	private initializeTermGrades(terms: any[]): any {
		return terms.reduce((acc, term) => ({
			...acc,
			[term.id]: {
				totalMarks: 0,
				obtainedMarks: 0,
				percentage: 0,
				grade: null,
				periodGrades: {},
				finalGrade: 0,
				isPassing: false,
				gradePoints: 0,
				credits: 0
			}
		}), {});
	}

	private initializeAssessmentPeriodGrades(periods: any[]): any {
		return periods.reduce((acc, period) => ({
			...acc,
			[period.id]: {
				totalMarks: 0,
				obtainedMarks: 0,
				percentage: 0,
				weight: period.weight,
				isPassing: false,
				gradePoints: 0
			}
		}), {});
	}

	async updateSubjectGradeRecord(
		gradeBookId: string,
		subjectId: string,
		termId: string,
		studentId: string
	): Promise<void> {
		const [termGrade, existingRecord] = await Promise.all([
			this.calculateSubjectTermGrade(subjectId, termId, studentId, gradeBookId),
			this.db.subjectGradeRecord.findUnique({
				where: {
					id: `${gradeBookId}_${subjectId}`
				}
			})
		]);
		
		const existingTermGrades = existingRecord?.termGrades ? 
			JSON.parse(existingRecord.termGrades as string) : {};
		
		await this.db.subjectGradeRecord.upsert({
			where: {
				id: `${gradeBookId}_${subjectId}`
			},
			update: {
				termGrades: JSON.stringify({
					...existingTermGrades,
					[termId]: termGrade
				})
			},
			create: {
				id: `${gradeBookId}_${subjectId}`,
				gradeBookId,
				subjectId,
				termGrades: JSON.stringify({
					[termId]: termGrade
				}),
				assessmentPeriodGrades: JSON.stringify({})
			}
		});


		// Record grade history
		await this.recordGradeHistory(studentId, subjectId, termGrade);
	}

	private async recordGradeHistory(
		studentId: string,
		subjectId: string,
		termGrade: SubjectTermGrade
	): Promise<void> {
		await this.db.gradeHistory.create({
			data: {
				studentId,
				subjectId,
				gradeValue: termGrade.finalGrade,
				modifiedBy: 'SYSTEM',
				reason: 'Term grade calculation'
			}
		});
	}


}