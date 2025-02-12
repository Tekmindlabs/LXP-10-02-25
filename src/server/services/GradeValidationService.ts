import { PrismaClient, Prisma } from '@prisma/client';

interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

interface GradeEntry {
	studentId: string;
	assessmentId: string;
	obtainedMarks: number;
	totalMarks: number;
	submissionDate: Date;
}

export class GradeValidationService {

	constructor(private db: PrismaClient) {}

	async validateGradeEntry(entry: GradeEntry): Promise<ValidationResult> {
		const errors: string[] = [];

		if (entry.obtainedMarks < 0) {
			errors.push('Obtained marks cannot be negative');
		}
		if (entry.obtainedMarks > entry.totalMarks) {
			errors.push('Obtained marks cannot exceed total marks');
		}

		const assessment = await this.db.assessment.findUnique({
			where: { id: entry.assessmentId }
		});

		if (!assessment) {
			errors.push('Assessment not found');
			return { isValid: false, errors };
		}

		const existingSubmission = await this.db.assessmentSubmission.findFirst({
			where: {
				assessmentId: entry.assessmentId,
				studentId: entry.studentId,
				gradedAt: { not: null }
			}
		});

		if (existingSubmission) {
			errors.push('Grade entry already exists for this assessment');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}


	async validateAssessmentPeriodCompletion(
		studentId: string,
		periodId: string
	): Promise<ValidationResult> {
		const errors: string[] = [];

		const period = await this.db.termAssessmentPeriod.findUnique({
			where: { id: periodId }
		});

		if (!period) {
			errors.push('Assessment period not found');
			return { isValid: false, errors };
		}

		// Get activities with assessments for the period
		const activities = await this.db.classActivity.findMany({
			where: {
				configuration: {
					path: ['assessmentId'],
					not: Prisma.JsonNull
				}
			}
		});

		const assessmentIds = activities
			.map(activity => (activity.configuration as any).assessmentId)
			.filter(Boolean);

		if (assessmentIds.length > 0) {
			const assessments = await this.db.assessment.findMany({
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

			assessments.forEach(assessment => {
				if (assessment.submissions.length === 0) {
					errors.push(`Missing submission for assessment: ${assessment.title}`);
				}
			});
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}


	async validateTermGradeCalculation(
		studentId: string,
		termId: string
	): Promise<ValidationResult> {
		const errors: string[] = [];

		const academicTerm = await this.db.academicTerm.findUnique({
			where: { id: termId },
			include: {
				assessmentPeriods: true
			}
		});

		if (!academicTerm) {
			errors.push('Term not found');
			return { isValid: false, errors };
		}

		for (const period of academicTerm.assessmentPeriods) {
			const periodValidation = await this.validateAssessmentPeriodCompletion(
				studentId,
				period.id
			);
			errors.push(...periodValidation.errors);
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}
}
