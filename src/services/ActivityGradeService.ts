import { PrismaClient, Prisma } from '@prisma/client';
import { SubjectGradeManager } from './SubjectGradeManager';

interface ActivityGrade {
	activityId: string;
	studentId: string;
	grade: number;
	assessmentPeriodId: string;
	subjectId: string;
}

interface AssessmentPeriodGrade {
	grade: number | null;
	status: 'PENDING' | 'COMPLETED';
	activities: Array<{
		activityId: string;
		grade: number;
	}>;
}

type AssessmentPeriodGrades = Record<string, AssessmentPeriodGrade>;

export class ActivityGradeService {
	private db: PrismaClient;
	private subjectGradeManager: SubjectGradeManager;

	constructor(
		db: PrismaClient,
		subjectGradeManager: SubjectGradeManager
	) {
		this.db = db;
		this.subjectGradeManager = subjectGradeManager;
	}

	async recordActivityGrade(data: ActivityGrade): Promise<void> {
		await this.db.$transaction(async (tx) => {
			// Record the activity grade
			await tx.activityGrade.create({
				data: {
					activity: { connect: { id: data.activityId } },
					student: { connect: { id: data.studentId } },
					value: data.grade,
					assessmentPeriod: { connect: { id: data.assessmentPeriodId } },
					status: 'ACTIVE'
				}
			});

			// Update the subject grade record's assessment period grades
			await this.updateAssessmentPeriodGrades(data);

			// Recalculate assessment period grade
			await this.subjectGradeManager.calculateAssessmentPeriodGrade(
				data.subjectId,
				data.assessmentPeriodId,
				data.studentId
			);
		});
	}

	private async updateAssessmentPeriodGrades(data: ActivityGrade): Promise<void> {
		const subjectRecord = await this.db.subjectGradeRecord.findFirst({
			where: {
				subjectId: data.subjectId,
				gradeBook: {
					class: {
						students: {
							some: {
								id: data.studentId
							}
						}
					}
				}
			}
		});

		if (!subjectRecord) {
			throw new Error('Subject grade record not found');
		}

		const assessmentPeriodGrades = JSON.parse(
			subjectRecord.assessmentPeriodGrades as string
		) as AssessmentPeriodGrades;

		const periodGrades = assessmentPeriodGrades[data.assessmentPeriodId];
		if (!periodGrades.activities) {
			periodGrades.activities = [];
		}

		// Add or update activity grade
		const activityIndex = periodGrades.activities.findIndex(
			(a) => a.activityId === data.activityId
		);

		if (activityIndex >= 0) {
			periodGrades.activities[activityIndex].grade = data.grade;
		} else {
			periodGrades.activities.push({
				activityId: data.activityId,
				grade: data.grade
			});
		}

		// Update the record
		await this.db.subjectGradeRecord.update({
			where: { id: subjectRecord.id },
			data: {
				assessmentPeriodGrades: JSON.stringify(assessmentPeriodGrades) as unknown as Prisma.JsonValue
			}
		});
	}
}
