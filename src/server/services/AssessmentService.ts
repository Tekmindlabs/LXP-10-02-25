import { PrismaClient, Assessment, Prisma } from '@prisma/client';

interface AssessmentWithScore {
	id: string;
	totalPoints: number;
	obtainedMarks: number;
}

interface RubricScore {
	criteriaId: string;
	levelId: string;
	points: number;
}

export class AssessmentService {
	constructor(private db: PrismaClient) {}

	async getAssessmentForActivity(activityId: string): Promise<Assessment | null> {
		// Since there's no direct relationship between ClassActivity and Assessment,
		// we'll use the activity type and configuration to determine the assessment
		const activity = await this.db.classActivity.findUnique({
			where: { id: activityId }
		});

		if (!activity) return null;

		// Assuming the assessment ID is stored in the activity configuration
		const config = activity.configuration as { assessmentId?: string };
		if (!config.assessmentId) return null;

		return this.db.assessment.findUnique({
			where: { id: config.assessmentId },
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
	}



	async calculatePercentageFromMarkingScheme(
		markingSchemeId: string,
		obtainedMarks: number,
		totalMarks: number
	): Promise<number> {
		const markingScheme = await this.db.markingScheme.findUnique({
			where: { id: markingSchemeId },
			include: { gradingScale: true }
		});

		if (!markingScheme) return 0;

		const percentage = (obtainedMarks / totalMarks) * 100;
		const grade = markingScheme.gradingScale.find(
			scale => percentage >= scale.minPercentage && percentage <= scale.maxPercentage
		);

		return grade ? (grade.maxPercentage + grade.minPercentage) / 2 : percentage;
	}

	async calculatePercentageFromRubric(
		rubricId: string,
		scores: RubricScore[][]
	): Promise<number> {
		const rubric = await this.db.rubric.findUnique({
			where: { id: rubricId },
			include: {
				criteria: {
					include: {
						levels: true
					}
				}
			}
		});

		if (!rubric) return 0;

		let totalPoints = 0;
		let maxPoints = 0;

		scores.forEach(submissionScores => {
			submissionScores.forEach(score => {
				const criteria = rubric.criteria.find(c => c.id === score.criteriaId);
				if (criteria) {
					const level = criteria.levels.find(l => l.id === score.levelId);
					if (level) {
						totalPoints += level.points;
						maxPoints += Math.max(...criteria.levels.map(l => l.points));
					}
				}
			});
		});

		return maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
	}

	async calculateGPA(percentage: number, assessmentSystemId: string): Promise<number> {
		const assessmentSystem = await this.db.assessmentSystem.findUnique({
			where: { id: assessmentSystemId }
		});

		if (!assessmentSystem || !assessmentSystem.cgpaConfig) return 0;

		const cgpaConfig = assessmentSystem.cgpaConfig as any;
		const gradePoint = cgpaConfig.gradePoints.find(
			(gp: any) => percentage >= gp.minPercentage && percentage <= gp.maxPercentage
		);

		return gradePoint ? gradePoint.points : 0;
	}

	async getSubjectTermAssessments(
		subjectId: string,
		_termId: string
	): Promise<AssessmentWithScore[]> {
		// First get all activities for the subject and term
		const activities = await this.db.classActivity.findMany({
			where: {
				subjectId,
				configuration: {
					path: ['assessmentId'],
					not: Prisma.JsonNull
				}

			},
			select: {
				configuration: true
			}
		});

		const assessmentIds = activities
			.map(activity => (activity.configuration as any).assessmentId)
			.filter(Boolean);

		if (assessmentIds.length === 0) {
			return [];
		}

		const assessments = await this.db.assessment.findMany({
			where: {
				id: {
					in: assessmentIds
				}
			},
			include: {
				submissions: true
			}
		});

		return assessments.map(assessment => ({
			id: assessment.id,
			totalPoints: assessment.totalPoints,
			obtainedMarks: assessment.submissions[0]?.obtainedMarks ?? 0
		}));
	}
}