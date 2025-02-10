import { PrismaClient, Status, Prisma } from '@prisma/client';
import { 
	AssessmentSystem, 
	MarkingScheme, 
	Rubric,
	Assessment,
	AssessmentSubmission,
	SubmissionStatus,
	RubricCriteria
} from '@/types/assessment';


export class AssessmentService {
	private db: PrismaClient;

	constructor(db: PrismaClient) {
		this.db = db;
	}

	// Assessment System Methods
	async createAssessmentSystem(data: AssessmentSystem) {
		return this.db.assessmentSystem.create({
			data: {
				name: data.name,
				description: data.description,
				type: data.type,
				programId: data.programId
			}
		});
	}

	async updateAssessmentSystem(programId: string, updates: {
		system: AssessmentSystem & {
			markingSchemes?: MarkingScheme[];
			rubrics?: Rubric[];
		};
		propagateToClassGroups?: boolean;
	}) {
		const updatedSystem = await this.db.assessmentSystem.update({
			where: { programId },
			data: {
				name: updates.system.name,
				type: updates.system.type,
				description: updates.system.description || undefined,
				markingSchemes: updates.system.type === 'MARKING_SCHEME' ? {
					deleteMany: {},
					create: updates.system.markingSchemes?.map(scheme => ({
						name: scheme.name,
						maxMarks: scheme.maxMarks,
						passingMarks: scheme.passingMarks,
						gradingScale: {
							createMany: {
								data: scheme.gradingScale
							}
						}
					}))
				} : undefined,
				rubrics: updates.system.type === 'RUBRIC' ? {
					deleteMany: {},
					create: updates.system.rubrics?.map(rubric => ({
						name: rubric.name,
						description: rubric.description,
						criteria: {
							create: (rubric.criteria as RubricCriteria[]).map(criterion => ({
								name: criterion.name,
								description: criterion.description,
								levels: {
									createMany: {
										data: criterion.levels
									}
								}
							}))
						}
					}))
				} : undefined

			},
			include: {
				markingSchemes: {
					include: {
						gradingScale: true
					}
				},
				rubrics: {
					include: {
						criteria: {
							include: {
								levels: true
							}
						}
					}
				}
			}
		});

		if (updates.propagateToClassGroups) {
			await this.propagateAssessmentUpdatesToClassGroups(
				programId, 
				updatedSystem as unknown as AssessmentSystem
			);
		}

		return updatedSystem;
	}

	async propagateAssessmentUpdatesToClassGroups(
		programId: string, 
		assessmentSystem: AssessmentSystem
	) {
		const classGroups = await this.db.classGroup.findMany({
			where: { 
				programId,
				status: Status.ACTIVE
			}
		});

		return Promise.all(
			classGroups.map(group => 
				this.db.$transaction(async (tx) => {
					const existingSettings = await tx.classGroupAssessmentSettings.findFirst({
						where: {
							classGroupId: group.id,
							assessmentSystemId: assessmentSystem.id
						}
					});

					if (existingSettings) {
						return tx.classGroupAssessmentSettings.update({
							where: {
								id: existingSettings.id
							},
							data: {
								customSettings: Prisma.JsonNull,
								isCustomized: false
							}
						});
					}

					return tx.classGroupAssessmentSettings.create({
						data: {
							classGroup: { connect: { id: group.id } },
							assessmentSystem: { connect: { id: assessmentSystem.id } },
							customSettings: Prisma.JsonNull,
							isCustomized: false
						}
					});
				})
			)
		);
	}

	// Marking Scheme Methods
	async createMarkingScheme(data: MarkingScheme) {
		return this.db.markingScheme.create({
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
		return this.db.rubric.create({
			data: {
				name: data.name,
				description: data.description,
				assessmentSystemId: data.assessmentSystemId,
				criteria: {
					create: (data.criteria as RubricCriteria[]).map(criterion => ({
						name: criterion.name,
						description: criterion.description,
						levels: {
							create: criterion.levels.map(level => ({
								name: level.name,
								description: level.description,
								points: level.points
							}))
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
		return this.db.assessment.create({
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
		return this.db.assessmentSubmission.create({
			data: {
				assessmentId: data.assessmentId,
				studentId: data.studentId,
				status: data.status,
				submittedAt: new Date()
			}
		});
	}

	async gradeSubmissionWithMarkingScheme(submissionId: string, marks: number) {
		const submission = await this.db.assessmentSubmission.findUnique({
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

		if (!submission || !submission.assessment.markingScheme) {
            throw new Error("Submission or marking scheme not found");
		}

		const percentage = (marks / submission.assessment.markingScheme.maxMarks) * 100;
		const grade = this.calculateGrade(percentage, submission.assessment.markingScheme.gradingScale);

		return this.db.assessmentSubmission.update({
			where: { id: submissionId },
			data: {
				obtainedMarks: marks,
				percentage,
				grade,
				status: 'GRADED',
				gradedAt: new Date()
			}
		});
	}

	async gradeSubmissionWithRubric(submissionId: string, criteriaScores: Record<string, number>) {
		const submission = await this.db.assessmentSubmission.findUnique({
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

		return this.db.assessmentSubmission.update({
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