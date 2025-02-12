import { GradeValidationResult, SubjectAssessmentConfig } from '../../types/grades';
import { PrismaClient } from '@prisma/client';

export class GradeValidationService {
	constructor(private db: PrismaClient) {}

	async validateGradeEntry(
		studentId: string,
		subjectId: string,
		assessmentId: string,
		grade: number,
		config: SubjectAssessmentConfig
	): Promise<GradeValidationResult> {
		const errors = [];

		// Validate grade range
		if (grade < 0 || grade > 100) {
			errors.push({
				code: 'INVALID_GRADE_RANGE',
				message: 'Grade must be between 0 and 100',
				field: 'grade'
			});
		}

		// Validate required assessments
		const isRequiredAssessment = config.passingCriteria.requiredAssessments.includes(assessmentId);
		if (isRequiredAssessment && !grade) {
			errors.push({
				code: 'REQUIRED_ASSESSMENT_MISSING',
				message: 'This assessment is required for passing the subject',
				field: 'assessmentId'
			});
		}

		// Validate attendance if required
		if (config.passingCriteria.minAttendance) {
			const attendance = await this.getStudentAttendance(studentId, subjectId);
			if (attendance < config.passingCriteria.minAttendance) {
				errors.push({
					code: 'INSUFFICIENT_ATTENDANCE',
					message: `Minimum attendance requirement (${config.passingCriteria.minAttendance}%) not met`,
					field: 'attendance'
				});
			}
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	private async getStudentAttendance(studentId: string, subjectId: string): Promise<number> {
		const attendanceRecords = await this.db.attendance.findMany({
			where: {
				studentId,
				subjectId
			}
		});

		if (!attendanceRecords.length) return 0;

		const presentCount = attendanceRecords.filter(record => record.status === 'PRESENT').length;
		return (presentCount / attendanceRecords.length) * 100;
	}

	async validateBatchOperation(config: SubjectAssessmentConfig): Promise<GradeValidationResult> {

		const errors = [];

		// Validate total weightage
		const totalWeightage = Object.values(config.weightageDistribution).reduce((sum, weight) => sum + weight, 0);
		if (Math.abs(totalWeightage - 100) > 0.01) {
			errors.push({
				code: 'INVALID_WEIGHTAGE_TOTAL',
				message: 'Total weightage must equal 100%',
				field: 'weightageDistribution'
			});
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}
}

