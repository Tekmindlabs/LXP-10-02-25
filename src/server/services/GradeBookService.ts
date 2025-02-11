import { PrismaClient, AssessmentSystemType } from '@prisma/client';
import { AssessmentService } from './AssessmentService';
import { TermManagementService } from './TermManagementService';
import { SubjectGradeManager } from './SubjectGradeManager';

interface CumulativeGrade {
	gpa: number;
	totalCredits: number;
	earnedCredits: number;
	subjectGrades: Record<string, SubjectTermGrade>;
}

export class GradeBookService {
	private subjectGradeManager: SubjectGradeManager;

	constructor(
		private db: PrismaClient,
		private assessmentService: AssessmentService,
		private termService: TermManagementService
	) {
		this.subjectGradeManager = new SubjectGradeManager(db);
	}


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
		if (!classData?.classGroup?.program) {
			throw new Error('Invalid class data structure');
		}

		const { program, classGroup } = classData.classGroup;
		
		// Start with program's assessment system
		const assessmentSystem = program.assessmentSystem;
		
		// Check for class group customizations
		const classGroupSettings = await this.db.classGroupAssessmentSettings.findFirst({
			where: { 
				classGroupId: classGroup.id,
				assessmentSystemId: assessmentSystem.id
			}
		});

		// Apply class group customizations if they exist
		const finalSystem = classGroupSettings?.isCustomized ? 
			{ ...assessmentSystem, ...classGroupSettings.customSettings } : 
			assessmentSystem;

		if (!finalSystem) {
			throw new Error('No assessment system found in inheritance chain');
		}

		return finalSystem;
	}

	async calculateCumulativeGrade(
		gradeBookId: string,
		studentId: string,
		termId: string
	): Promise<CumulativeGrade> {
		const gradeBook = await this.db.gradeBook.findUnique({
			where: { id: gradeBookId },
			include: {
				assessmentSystem: true,
				subjectRecords: true,
				class: {
					include: {
						classGroup: {
							include: {
								subjects: true,
								program: {
									include: {
										termStructures: {
											include: {
												termSettings: true
											}
										}
									}
								}
							}
						}
					}
				}
			}
		});

		if (!gradeBook) throw new Error('Grade book not found');

		const subjectGrades: Record<string, SubjectTermGrade> = {};
		let totalGradePoints = 0;
		let totalCredits = 0;
		let earnedCredits = 0;

		// Get term settings for weightage
		const termStructure = gradeBook.class.classGroup.program.termStructures.find(
			ts => ts.academicTerms.some(at => at.termId === termId)
		);

		const termSettings = termStructure?.termSettings.find(
			ts => ts.classGroupId === gradeBook.class.classGroup.id
		);

		// Calculate grades for each subject
		for (const subject of gradeBook.class.classGroup.subjects) {
			const termGrade = await this.subjectGradeManager.calculateSubjectTermGrade(
				subject.id,
				termId,
				studentId,
				gradeBook.assessmentSystemId
			);
			
			subjectGrades[subject.id] = termGrade;
			
			// Apply term weightage if configured
			const weightedGradePoints = termGrade.gradePoints * (termSettings?.weight || 1.0);
			totalGradePoints += weightedGradePoints * termGrade.credits;
			totalCredits += termGrade.credits;
			
			if (termGrade.isPassing) {
				earnedCredits += termGrade.credits;
			}

			// Update subject grade record
			await this.subjectGradeManager.updateSubjectGradeRecord(
				gradeBookId,
				subject.id,
				termId,
				studentId
			);
		}

		const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

		// Record term result
		await this.recordTermResult(
			studentId,
			termId,
			gpa,
			totalCredits,
			earnedCredits,
			termSettings?.customSettings
		);

		return {
			gpa,
			totalCredits,
			earnedCredits,
			subjectGrades
		};
	}

	private async recordTermResult(
		studentId: string,
		termId: string,
		gpa: number,
		totalCredits: number,
		earnedCredits: number,
		customSettings?: any
	): Promise<void> {
		await this.db.termResult.upsert({
			where: {
				studentId_programTermId: {
					studentId,
					programTermId: termId
				}
			},
			update: {
				gpa,
				totalCredits,
				earnedCredits,
				metadata: customSettings
			},
			create: {
				studentId,
				programTermId: termId,
				gpa,
				totalCredits,
				earnedCredits,
				metadata: customSettings
			}
		});
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