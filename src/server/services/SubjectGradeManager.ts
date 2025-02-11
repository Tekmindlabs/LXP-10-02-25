import { PrismaClient, AssessmentSystemType } from '@prisma/client';
import { AssessmentService } from './AssessmentService';

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
		assessmentSystemId: string
	): Promise<AssessmentPeriodGrade> {
		const period = await this.db.termAssessmentPeriod.findUnique({
			where: { id: periodId }
		});

		const submissions = await this.db.activitySubmission.findMany({
			where: {
				activity: {
					subjectId,
					createdAt: {
						gte: period?.startDate,
						lte: period?.endDate
					}
				},
				studentId,
				gradedAt: { not: null }
			},
			include: {
				activity: {
					include: {
						subject: true
					}
				}
			}
		});

		let totalObtained = 0;
		let totalPossible = 0;
		let percentage = 0;

		for (const submission of submissions) {
			const assessment = await this.assessmentService.getAssessmentForActivity(submission.activityId);
			
			if (assessment) {
				switch (assessment.type) {
					case 'MARKING_SCHEME':
						percentage = await this.assessmentService.calculatePercentageFromMarkingScheme(
							assessment.markingSchemeId!,
							submission.obtainedMarks || 0,
							submission.totalMarks || 0
						);
						break;
					case 'RUBRIC':
						percentage = await this.assessmentService.calculatePercentageFromRubric(
							assessment.rubricId!,
							[submission.rubricScores as any]
						);
						break;
					default:
						percentage = submission.obtainedMarks && submission.totalMarks ? 
							(submission.obtainedMarks / submission.totalMarks) * 100 : 0;
				}
			}

			totalObtained += submission.obtainedMarks || 0;
			totalPossible += submission.totalMarks || 0;
		}

		const finalPercentage = percentage || (totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0);
		const gradePoints = await this.assessmentService.calculateGPA(finalPercentage, assessmentSystemId);

		return {
			periodId,
			obtainedMarks: totalObtained,
			totalMarks: totalPossible,
			percentage: finalPercentage,
			weight: period?.weight || 0,
			isPassing: finalPercentage >= 50,
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

	async updateSubjectGradeRecord(
		gradeBookId: string,
		subjectId: string,
		termId: string,
		studentId: string
	): Promise<void> {
		const termGrade = await this.calculateSubjectTermGrade(subjectId, termId, studentId);
		
		await this.db.subjectGradeRecord.upsert({
			where: {
				gradeBookId_subjectId: {
					gradeBookId,
					subjectId
				}
			},
			update: {
				termGrades: {
					[termId]: termGrade
				}
			},
			create: {
				gradeBookId,
				subjectId,
				termGrades: {
					[termId]: termGrade
				},
				assessmentPeriodGrades: {}
			}
		});
	}
}