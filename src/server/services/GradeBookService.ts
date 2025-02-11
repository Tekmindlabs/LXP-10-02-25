import { PrismaClient, AssessmentSystemType, Prisma } from '@prisma/client';
import { AssessmentService } from './AssessmentService';
import { TermManagementService } from './TermManagementService';
import { SubjectGradeManager } from './SubjectGradeManager';

interface CreateClassInput {
	name: string;
	classGroupId: string;
	capacity: number;
}

interface CumulativeGrade {
	gpa: number;
	totalCredits: number;
	earnedCredits: number;
	subjectGrades: Record<string, SubjectTermGrade>;
}

type PrismaTransaction = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use">;

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
		const termStructure = classData.classGroup.program.termStructures[0]; // Get default term structure

		if (!termStructure) {
			throw new Error('No term structure found for program');
		}
		
		// Create grade book with subject records and term structure
		await this.db.gradeBook.create({
			data: {
				classId,
				assessmentSystemId: assessmentSystem.id,
				termStructureId: termStructure.id,
				subjectRecords: {
					create: classData.classGroup.subjects.map(subject => ({
						subjectId: subject.id,
						termGrades: {},
						assessmentPeriodGrades: {}
					}))
				}
			}
		});

		// Update class with term structure
		await this.db.class.update({
			where: { id: classId },
			data: { termStructureId: termStructure.id }
		});
	}

	async createClassWithInheritance(classData: CreateClassInput): Promise<any> {
		// Start transaction for atomic operations
		return await this.db.$transaction(async (tx) => {
			// 1. Create class with inherited class group settings
			const newClass = await tx.class.create({
				data: {
					name: classData.name,
					classGroupId: classData.classGroupId,
					capacity: classData.capacity,
					status: 'ACTIVE'
				}
			});

			// 2. Inherit term management settings
			const termSettings = await this.termService.inheritClassGroupTerms(
				classData.classGroupId,
				newClass.id
			);

			// Update class with term structure
			await tx.class.update({
				where: { id: newClass.id },
				data: { termStructureId: termSettings.id }
			});

			// 3. Inherit assessment system
			const assessmentSystem = await this.resolveAndInheritAssessmentSystem(
				classData.classGroupId,
				newClass.id,
				tx
			);

			// 4. Initialize grade book with inherited settings
			const gradeBook = await tx.gradeBook.create({
				data: {
					classId: newClass.id,
					assessmentSystemId: assessmentSystem.id,
					termStructureId: termSettings.id
				}
			});

			// 5. Inherit and create subject grade records
			await this.initializeSubjectGradeRecords(
				tx,
				gradeBook.id,
				classData.classGroupId
			);

			return newClass;
		});
	}

	private async initializeSubjectGradeRecords(
		tx: PrismaTransaction,
		gradeBookId: string,
		classGroupId: string
	): Promise<void> {
		// Get subjects from class group
		const classGroup = await tx.classGroup.findUnique({
			where: { id: classGroupId },
			include: {
				subjects: true,
			},
		});

		if (!classGroup) {
			throw new Error(`ClassGroup with id ${classGroupId} not found`);
		}

		// Create subject grade records
		await tx.subjectGradeRecord.createMany({
			data: classGroup.subjects.map(subject => ({
				gradeBookId,
				subjectId: subject.id,
				termGrades: {},
				assessmentPeriodGrades: {}
			}))
		});
	}

	private async resolveAndInheritAssessmentSystem(
		classGroupId: string,
		classId: string,
		tx: PrismaTransaction
	): Promise<any> {
		const classGroup = await this.db.classGroup.findUnique({
			where: { id: classGroupId },
			include: {
				program: {
					include: {
						assessmentSystem: true
					}
				},
				assessmentSettings: true
			}
		});

		if (!classGroup) {
			throw new Error(`ClassGroup with id ${classGroupId} not found`);
		}

		// Inherit from program's assessment system
		const baseAssessmentSystem = classGroup.program.assessmentSystem;

		if (!baseAssessmentSystem) {
			throw new Error(`AssessmentSystem not found for program of ClassGroup ${classGroupId}`);
		}

		// Check for class group customizations
		const classGroupAssessmentSettings = classGroup.assessmentSettings.find(setting => setting.assessmentSystemId === baseAssessmentSystem.id);

		// Apply customizations if they exist
		const finalAssessmentSystem = classGroupAssessmentSettings?.isCustomized
			? { ...baseAssessmentSystem, ...classGroupAssessmentSettings.customSettings }
			: baseAssessmentSystem;

		return finalAssessmentSystem;
	}

	private async initializeGradeBookWithTransaction(
		tx: Prisma.TransactionClient,
		classId: string
	): Promise<void> {
		const classData = await tx.class.findUnique({
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

		const assessmentSystem = await this.resolveAssessmentSystemWithTransaction(tx, classData);
		
		// Create grade book with subject records
		await tx.gradeBook.create({
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

	private async resolveAssessmentSystemWithTransaction(
		tx: Prisma.TransactionClient,
		classData: any
	) {
		if (!classData?.classGroup?.program) {
			throw new Error('Invalid class data structure');
		}

		const { program, classGroup } = classData.classGroup;
		
		// Start with program's assessment system
		const assessmentSystem = program.assessmentSystem;
		
		// Check for class group customizations
		const classGroupSettings = await tx.classGroupAssessmentSettings.findFirst({
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