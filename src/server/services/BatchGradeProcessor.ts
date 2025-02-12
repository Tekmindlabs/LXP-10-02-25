import { PrismaClient } from '@prisma/client';
import { CacheManager } from './CacheManager';
import { SubjectGradeManager } from './SubjectGradeManager';

interface BatchConfig {
	batchSize: number;
	maxRetries: number;
	retryDelay: number;
}

export class BatchGradeProcessor {
	private cache: CacheManager;
	private config: BatchConfig = {
		batchSize: 100,
		maxRetries: 3,
		retryDelay: 1000
	};

	constructor(
		private db: PrismaClient,
		private subjectGradeManager: SubjectGradeManager,
		config?: Partial<BatchConfig>
	) {
		this.cache = new CacheManager();
		if (config) {
			this.config = { ...this.config, ...config };
		}
	}

	async processBatchGradeCalculation(
		classId: string,
		termId: string
	): Promise<void> {
		const students = await this.db.studentProfile.findMany({
			where: { classId }
		});

		const subjects = await this.db.subject.findMany({
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

		// Process in batches
		for (let i = 0; i < students.length; i += this.config.batchSize) {
			const batch = students.slice(i, i + this.config.batchSize);
			await this.processBatch(batch, subjects, termId);
		}
	}

	private async processBatch(
		students: Array<{ userId: string }>,
		subjects: Array<{ id: string }>,
		termId: string
	): Promise<void> {
		const tasks = students.flatMap(student =>
			subjects.map(subject =>
				this.processGradeWithRetry(student.userId, subject.id, termId)
			)
		);

		await Promise.all(tasks);
	}

	private async processGradeWithRetry(
		studentId: string,
		subjectId: string,
		termId: string,
		attempt = 1
	): Promise<void> {
		try {
			const cacheKey = `grade:${studentId}:${subjectId}:${termId}`;
			
			await this.cache.getOrSet(cacheKey, async () => {
				const grade = await this.subjectGradeManager.calculateSubjectTermGrade(
					subjectId,
					termId,
					studentId,
					'default'
				);
				return grade;
			});
		} catch (error) {
			if (attempt < this.config.maxRetries) {
				await new Promise(resolve => 
					setTimeout(resolve, this.config.retryDelay * attempt)
				);
				return this.processGradeWithRetry(
					studentId,
					subjectId,
					termId,
					attempt + 1
				);
			}
			throw error;
		}
	}

	async calculateClassStatistics(
		classId: string,
		termId: string
	): Promise<{
		averageGrade: number;
		passRate: number;
		totalStudents: number;
	}> {
		const gradeBook = await this.db.gradeBook.findUnique({
			where: { classId },
			include: {
				subjectRecords: true
			}
		});

		if (!gradeBook) {
			throw new Error('Grade book not found');
		}

		let totalGrades = 0;
		let passingGrades = 0;
		let count = 0;

		gradeBook.subjectRecords.forEach(record => {
			const termGrades = record.termGrades as any;
			if (termGrades?.[termId]) {
				count++;
				totalGrades += termGrades[termId].percentage;
				if (termGrades[termId].isPassing) {
					passingGrades++;
				}
			}
		});

		return {
			averageGrade: count > 0 ? totalGrades / count : 0,
			passRate: count > 0 ? (passingGrades / count) * 100 : 0,
			totalStudents: count
		};
	}
}
