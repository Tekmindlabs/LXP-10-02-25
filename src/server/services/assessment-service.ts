import { PrismaClient } from '@prisma/client';
import { 
	AssessmentSystem, 
	MarkingScheme, 
	Rubric, 
	Assessment,
	AssessmentSubmission,
	SubmissionStatus
} from '../../types/assessment';

export class AssessmentService {
	constructor(private prisma: PrismaClient) {}

	// Assessment System Methods
	async createAssessmentSystem(data: AssessmentSystem) {
		return this.prisma.assessmentSystem.create({
			data: {
				name: data.name,
				description: data.description,
				type: data.type,
				programId: data.programId
			}
		});
	}

	// Marking Scheme Methods
	async createMarkingScheme(data: MarkingScheme) {
		return this.prisma.markingScheme.create({
			data: {
				name: data.name,
				maxMarks: data.maxMarks,
				passingMarks: data.passingMarks,
				assessmentSystemId: data.assessmentSystemId,
				gradingScale: {
					createMany: {
						data: data.gradingScale
					}
				}
			},
			include: {
				gradingScale: true
			}
		});
	}

	// Rubric Methods
	async createRubric(data: Rubric) {
		return this.prisma.rubric.create({
			data: {
				name: data.name,
				description: data.description,
				assessmentSystemId: data.assessmentSystemId,
				criteria: {
					create: data.criteria.map(criterion => ({
						name: criterion.name,
						description: criterion.description,
						levels: {
							createMany: {
								data: criterion.levels
							}
						}
					}))
				}
			},
			include: {
				criteria: {
					include: {
						levels: true
					}
				}
			}
		});
	}

	// Assessment Methods
	async createAssessment(data: Assessment) {
		return this.prisma.assessment.create({
			data: {
				title: data.title,
				description: data.description,
				type: data.type,
				totalPoints: data.totalPoints,
				markingSchemeId: data.markingSchemeId,
				rubricId: data.rubricId
			}
		});
	}

	// Submission Methods
	async submitAssessment(data: AssessmentSubmission) {
		return this.prisma.assessmentSubmission.create({
			data: {
				assessmentId: data.assessmentId,
				studentId: data.studentId,
				status: SubmissionStatus.SUBMITTED,
				submittedAt: new Date()
			}
		});
	}

	async gradeSubmissionWithMarkingScheme(submissionId: string, marks: number) {
		const submission = await this.prisma.assessmentSubmission.findUnique({
			where: { id: submissionId },
			include: {
				assessment: {
					include: {
						markingScheme: {
							include: {
								gradingScale: true
							}
						}
					}
				}
			}
		});

		if (!submission?.assessment.markingScheme) {
			throw new Error('Invalid submission or marking scheme');
		}

		const percentage = (marks / submission.assessment.markingScheme.maxMarks) * 100;
		const grade = this.calculateGrade(percentage, submission.assessment.markingScheme.gradingScale);

		return this.prisma.assessmentSubmission.update({
			where: { id: submissionId },
			data: {
				obtainedMarks: marks,
				percentage,
				grade,
				status: SubmissionStatus.GRADED,
				gradedAt: new Date()
			}
		});
	}

	async gradeSubmissionWithRubric(submissionId: string, criteriaScores: Record<string, number>) {
		const submission = await this.prisma.assessmentSubmission.findUnique({
			where: { id: submissionId },
			include: {
				assessment: {
					include: {
						rubric: {
							include: {
								criteria: {
									include: {
										levels: true
									}
								}
							}
						}
					}
				}
			}
		});

		if (!submission?.assessment.rubric) {
			throw new Error('Invalid submission or rubric');
		}

		const totalScore = Object.values(criteriaScores).reduce((sum, score) => sum + score, 0);

		return this.prisma.assessmentSubmission.update({
			where: { id: submissionId },
			data: {
				rubricScores: criteriaScores,
				totalScore,
				status: SubmissionStatus.GRADED,
				gradedAt: new Date()
			}
		});
	}

	private calculateGrade(percentage: number, gradingScale: any[]): string {
		const grade = gradingScale.find(
			scale => percentage >= scale.minPercentage && percentage <= scale.maxPercentage
		);
		return grade?.grade || 'F';
	}
}