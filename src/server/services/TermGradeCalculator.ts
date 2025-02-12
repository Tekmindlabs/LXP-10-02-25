import { PrismaClient, Prisma } from '@prisma/client';

interface TermGrade {
	termId: string;
	subjectId: string;
	finalGrade: number;
	weightedGrade: number;
	assessmentPeriodGrades: Record<string, number>;
}

export class TermGradeCalculator {
	constructor(private prisma: PrismaClient) {}

	async calculateTermGrade(
		termId: string,
		subjectId: string,
		studentId: string
	): Promise<TermGrade> {
		const assessmentPeriods = await this.prisma.termAssessmentPeriod.findMany({
			where: { termId }
		});

		const assessmentPeriodGrades: Record<string, number> = {};
		let totalWeightedGrade = 0;
		let totalWeight = 0;

		for (const period of assessmentPeriods) {
			const periodGrade = await this.calculateAssessmentPeriodGrade(
				period.id,
				subjectId,
				studentId
			);
			
			assessmentPeriodGrades[period.id] = periodGrade;
			totalWeightedGrade += periodGrade * period.weight;
			totalWeight += period.weight;
		}

		const finalGrade = totalWeight > 0 ? totalWeightedGrade / totalWeight : 0;

		return {
			termId,
			subjectId,
			finalGrade,
			weightedGrade: totalWeightedGrade,
			assessmentPeriodGrades
		};
	}

	private async calculateAssessmentPeriodGrade(
		periodId: string,
		subjectId: string,
		studentId: string
	): Promise<number> {
		// First get activities for the period and subject
		const activities = await this.prisma.classActivity.findMany({
			where: {
				subjectId,
				configuration: {
					path: ['assessmentId'],
					not: Prisma.JsonNull
				}
			}
		});

		const assessmentIds = activities
			.map(activity => (activity.configuration as any).assessmentId)
			.filter(Boolean);

		if (assessmentIds.length === 0) {
			return 0;
		}

		const assessments = await this.prisma.assessment.findMany({
			where: {
				id: {
					in: assessmentIds
				}
			},
			include: {
				submissions: {
					where: {
						studentId
					}
				}
			}
		});

		let totalWeightedScore = 0;
		let totalPoints = 0;

		for (const assessment of assessments) {
			const submission = assessment.submissions[0];
			if (submission) {
				totalWeightedScore += (submission.obtainedMarks || 0);
				totalPoints += assessment.totalPoints;
			}
		}

		return totalPoints > 0 ? (totalWeightedScore / totalPoints) * 100 : 0;
	}

	async generateTermReport(termId: string, classId: string): Promise<{
		termId: string;
		classId: string;
		studentGrades: Record<string, Record<string, TermGrade>>;
	}> {
		const students = await this.prisma.studentProfile.findMany({
			where: { classId }
		});

		const subjects = await this.prisma.subject.findMany({
			where: {
				classGroups: {
					some: {
						classes: {
							some: {
								id: classId
							}
						}
					}
				}
			}
		});

		const studentGrades: Record<string, Record<string, TermGrade>> = {};

		for (const student of students) {
			studentGrades[student.userId] = {};
			
			for (const subject of subjects) {
				const termGrade = await this.calculateTermGrade(
					termId,
					subject.id,
					student.userId
				);
				
				studentGrades[student.userId][subject.id] = termGrade;
			}
		}

		return {
			termId,
			classId,
			studentGrades
		};
	}
}
