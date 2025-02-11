import { PrismaClient, AssessmentSystemType, ActivitySubmission, MarkingScheme, Rubric, AssessmentSystem } from '@prisma/client';
import { AssessmentService } from './AssessmentService';

interface InitializeGradeOptions {
	termId: string;
	assessmentPeriods: any[];
	assessmentSystemId: string;
}

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
					gradeBookId_subjectId: {
						gradeBookId,
						subjectId
					}
				}
			})
		]);
		
		const existingTermGrades = existingRecord?.termGrades || {};
		
		await this.db.subjectGradeRecord.upsert({
			where: {
				gradeBookId_subjectId: {
					gradeBookId,
					subjectId
				}
			},
			update: {
				termGrades: {
					...existingTermGrades,
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

	private async calculateAssessmentGrade(
		submission: ActivitySubmission,
		assessmentSystem: AssessmentSystem
	): Promise<number> {
		const assessment = await this.db.assessment.findFirst({
			where: { 
				submissions: {
					some: { id: submission.id }
				}
			},
			include: {
				markingScheme: true,
				rubric: {
					include: {
						criteria: {
							include: { levels: true }
						}
					}
				}
			}
		});

		if (!assessment) return 0;

		switch (assessmentSystem.type) {
			case 'MARKING_SCHEME':
				return this.calculateMarkingSchemeGrade(submission, assessment.markingScheme);
			case 'RUBRIC':
				return this.calculateRubricGrade(submission, assessment.rubric);
			case 'CGPA':
				return this.calculateCGPAGrade(submission, assessmentSystem.cgpaConfig);
			default:
				return (submission.obtainedMarks / submission.totalMarks) * 100;
		}
	}

	private calculateMarkingSchemeGrade(
		submission: ActivitySubmission,
		markingScheme: MarkingScheme
	): number {
		if (!markingScheme) return 0;
		const percentage = (submission.obtainedMarks / markingScheme.maxMarks) * 100;
		return percentage;
	}

	private calculateRubricGrade(
		submission: ActivitySubmission,
		rubric: Rubric
	): number {
		if (!rubric || !submission.rubricScores) return 0;
		
		const scores = submission.rubricScores as Record<string, number>;
		let totalPoints = 0;
		let maxPoints = 0;

		rubric.criteria.forEach(criterion => {
			const maxLevel = Math.max(...criterion.levels.map(l => l.points));
			maxPoints += maxLevel;
			totalPoints += scores[criterion.id] || 0;
		});

		return maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
	}

	private calculateCGPAGrade(
		submission: ActivitySubmission,
		cgpaConfig: any
	): number {
		const percentage = (submission.obtainedMarks / submission.totalMarks) * 100;
		const gradePoint = cgpaConfig?.gradePoints?.find(
			(gp: any) => percentage >= gp.minPercentage && percentage <= gp.maxPercentage
		);
		return gradePoint?.points || 0;
	}
}