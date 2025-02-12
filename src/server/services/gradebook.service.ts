import { PrismaClient, GradeBook, SubjectGradeRecord } from '@prisma/client';
import { db } from '@/lib/db';
import { SubjectGradeManager } from './SubjectGradeManager';

export class GradeBookService {
	private prisma: PrismaClient;
	private subjectGradeManager: SubjectGradeManager;

	constructor() {
		this.prisma = db;
		this.subjectGradeManager = new SubjectGradeManager(db);
	}

	async initializeGradeBook(classId: string): Promise<GradeBook> {
		const classData = await this.prisma.class.findUnique({
			where: { id: classId },
			include: {
				classGroup: {
					include: {
						program: { include: { assessmentSystem: true } },
						subjects: true
					}
				}
			}
		});

		if (!classData) throw new Error('Class not found');

		const gradeBook = await this.prisma.$transaction(async (tx) => {
			// Create gradebook
			const newGradeBook = await tx.gradeBook.create({
				data: {
					classId,
					assessmentSystemId: classData.classGroup.program.assessmentSystem?.id || '',
					termStructureId: classData.termStructureId || ''
				}
			});

			// Initialize subject records using SubjectGradeManager
			await Promise.all(
				classData.classGroup.subjects.map(subject =>
					this.subjectGradeManager.initializeSubjectGrades(
						newGradeBook.id,
						subject.id,
						classData.termStructureId || ''
					)
				)
			);

			return newGradeBook;
		});

		return gradeBook;
	}

	async getGradeBook(classId: string): Promise<GradeBook | null> {
		return await this.prisma.gradeBook.findUnique({
			where: { classId },
			include: {
				class: true,
				assessmentSystem: true,
				subjectRecords: {
					include: {
						subject: true
					}
				}
			}
		});
	}

	async updateSubjectGrade(
		gradeBookId: string,
		subjectId: string,
		termId: string,
		studentId: string,
		grade: number
	): Promise<SubjectGradeRecord> {
		// Use SubjectGradeManager to update grades
		return await this.subjectGradeManager.updateSubjectGradeRecord(
			gradeBookId,
			subjectId,
			termId,
			studentId,
			grade
		);
	}

	async calculateTermGrade(
		gradeBookId: string,
		subjectId: string,
		termId: string,
		studentId: string
	): Promise<number> {
		// Use SubjectGradeManager to calculate term grades
		return await this.subjectGradeManager.calculateAssessmentPeriodGrade(
			subjectId,
			termId,
			studentId
		);
	}
}