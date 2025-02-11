import { PrismaClient } from '@prisma/client';

export class GradeHistoryService {
	constructor(private db: PrismaClient) {}

	async trackGradeChange(
		studentId: string,
		subjectId: string,
		oldGrade: number,
		newGrade: number,
		modifiedBy: string,
		reason?: string
	): Promise<void> {
		await this.db.gradeHistory.create({
			data: {
				studentId,
				subjectId,
				gradeValue: newGrade,
				oldValue: oldGrade,
				modifiedBy,
				modifiedAt: new Date(),
				reason
			}
		});
	}

	async getGradeHistory(
		studentId: string,
		subjectId: string
	) {
		return this.db.gradeHistory.findMany({
			where: {
				studentId,
				subjectId
			},
			orderBy: {
				modifiedAt: 'desc'
			}
		});
	}
}