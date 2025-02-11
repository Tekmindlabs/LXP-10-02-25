import { PrismaClient, AssessmentSystemType } from '@prisma/client';
import { AssessmentService } from './AssessmentService';
import { TermManagementService } from './TermManagementService';

interface SubjectGrade {
	obtainedMarks: number;
	totalMarks: number;
	percentage: number;
	grade?: string;
	isPassing: boolean;
}

interface TermGrade {
	termId: string;
	grades: Record<string, SubjectGrade>; // subjectId -> grade
	gpa: number;
	totalCredits: number;
	earnedCredits: number;
}


export class GradeBookService {
	constructor(
		private db: PrismaClient,
		private assessmentService: AssessmentService,
		private termService: TermManagementService
	) {}

	async initializeGradeBook(classId: string): Promise<void> {
		const classData = await this.db.class.findUnique({
			where: { id: classId },
			include: {
				classGroup: {
					include: {
						program: {
							include: {
								assessmentSystem: true,
								termStructures: true
							}
						},
						subjects: true
					}
				}
			}
		});

		if (!classData) throw new Error('Class not found');

		const assessmentSystem = await this.resolveAssessmentSystem(classData);
		
		// Create grade book with subject records
		await this.db.gradeBook.create({
			data: {
				classId,
				assessmentSystemId: assessmentSystem.id,
				subjectRecords: {
					create: classData.classGroup.subjects.map(subject => ({
						subjectId: subject.id,
						termGrades: {},
						assessmentPeriodGrades: {}
					}))
				}
			}
		});
	}

	private async resolveAssessmentSystem(classData: any) {
		const { program, classGroup } = classData.classGroup;
		
		// Inheritance chain: Program -> ClassGroup -> Class
		const assessmentSystem = program.assessmentSystem;
		
		// Check for class group customizations
		const classGroupSettings = await this.db.classGroupAssessmentSettings.findFirst({
			where: { 
				classGroupId: classGroup.id,
				assessmentSystemId: assessmentSystem.id
			}
		});

		return classGroupSettings?.isCustomized ? 
			{ ...assessmentSystem, ...classGroupSettings.customSettings } : 
			assessmentSystem;
	}

	async calculateSubjectGrade(
		gradeBookId: string,
		subjectId: string,
		termId: string
	): Promise<SubjectGrade> {
		const submissions = await this.db.activitySubmission.findMany({
			where: {
				activity: {
					subjectId,
					class: { gradeBook: { id: gradeBookId } }
				},
				gradedAt: { not: null }
			},
			include: {
				activity: {
					include: {
						subject: true
					}
				}
			}
		});

		let totalObtained = 0;
		let totalPossible = 0;

		submissions.forEach(submission => {
			totalObtained += submission.obtainedMarks || 0;
			totalPossible += submission.totalMarks || 0;
		});

		const percentage = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;
		
		return {
			obtainedMarks: totalObtained,
			totalMarks: totalPossible,
			percentage,
			isPassing: percentage >= 50 // Configure passing threshold
		};
	}

	async calculateTermGrade(
		gradeBookId: string,
		termId: string
	): Promise<TermGrade> {
		const gradeBook = await this.db.gradeBook.findUnique({
			where: { id: gradeBookId },
			include: {
				subjectRecords: true,
				class: {
					include: {
						classGroup: {
							include: {
								subjects: true
							}
						}
					}
				}
			}
		});

		if (!gradeBook) throw new Error('Grade book not found');

		const subjectGrades: Record<string, SubjectGrade> = {};
		let totalGradePoints = 0;
		let totalCredits = 0;
		let earnedCredits = 0;

		for (const subject of gradeBook.class.classGroup.subjects) {
			const grade = await this.calculateSubjectGrade(gradeBookId, subject.id, termId);
			subjectGrades[subject.id] = grade;
			
			// Calculate GPA based on assessment system
			const gradePoints = this.calculateGradePoints(grade.percentage);
			totalGradePoints += gradePoints;
			totalCredits += 1; // Adjust based on subject credits
			if (grade.isPassing) earnedCredits += 1;
		}

		const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

		return {
			termId,
			grades: subjectGrades,
			gpa,
			totalCredits,
			earnedCredits
		};
	}

	private calculateGradePoints(percentage: number): number {
		// Implement grade point calculation based on assessment system
		if (percentage >= 90) return 4.0;
		if (percentage >= 80) return 3.5;
		if (percentage >= 70) return 3.0;
		if (percentage >= 60) return 2.5;
		if (percentage >= 50) return 2.0;
		return 0.0;
	}
}