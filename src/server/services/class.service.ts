import { PrismaClient, Class, Status } from '@prisma/client';
import { db } from '@/lib/db';
import { CalendarInheritanceService } from './CalendarInheritanceService';
import { AssessmentSystemInheritanceService } from './AssessmentSystemInheritanceService';

export class ClassService {
	private prisma: PrismaClient;
	private calendarInheritance: CalendarInheritanceService;
	private assessmentInheritance: AssessmentSystemInheritanceService;

	constructor() {
		this.prisma = db;
		this.calendarInheritance = new CalendarInheritanceService(db);
		this.assessmentInheritance = new AssessmentSystemInheritanceService(db);
	}

	async createClass(data: {
		name: string;
		classGroupId: string;
		capacity: number;
		termStructureId?: string;
	}): Promise<Class> {
		return await this.prisma.$transaction(async (tx) => {
			// Create class
			const newClass = await tx.class.create({
				data: {
					name: data.name,
					classGroupId: data.classGroupId,
					capacity: data.capacity,
					termStructureId: data.termStructureId,
					status: Status.ACTIVE
				}
			});

			// Get program ID for calendar inheritance
			const classGroup = await tx.classGroup.findUnique({
				where: { id: data.classGroupId },
				include: { program: true }
			});

			if (!classGroup) throw new Error('Class group not found');

			// Validate and setup calendar inheritance
			await this.calendarInheritance.validateInheritanceChain({
				program: classGroup.programId,
				classGroup: data.classGroupId,
				class: newClass.id
			});

			// Resolve assessment system
			const baseConfig = await this.assessmentInheritance.resolveAssessmentSystem(classGroup.programId);
			const assessmentSystem = await this.assessmentInheritance.mergeAssessmentSettings(
				baseConfig,
				data.classGroupId
			);
			
			// Initialize gradebook
			await tx.gradeBook.create({
				data: {
					classId: newClass.id,
					assessmentSystemId: assessmentSystem.id,
					termStructureId: data.termStructureId || await this.getDefaultTermStructureId(data.classGroupId)
				}
			});

			return newClass;
		});
	}




	private async getDefaultTermStructureId(classGroupId: string): Promise<string> {
		const classGroup = await this.prisma.classGroup.findUnique({
			where: { id: classGroupId },
			include: { program: { include: { termStructures: true } } }
		});
		return classGroup?.program?.termStructures[0]?.id || '';
	}

	async getClassById(id: string): Promise<Class | null> {
		return await this.prisma.class.findUnique({
			where: { id },
			include: {
				classGroup: true,
				gradeBook: true,
				students: true,
				teachers: true
			}
		});
	}

	async updateClass(id: string, data: Partial<Class>): Promise<Class> {
		return await this.prisma.class.update({
			where: { id },
			data
		});
	}

	async deleteClass(id: string): Promise<void> {
		await this.prisma.class.update({
			where: { id },
			data: { status: Status.ARCHIVED }
		});
	}

	async assignTeacher(classId: string, teacherId: string, isClassTeacher: boolean = false): Promise<void> {
		await this.prisma.teacherClass.create({
			data: {
				classId,
				teacherId,
				isClassTeacher
			}
		});
	}

	async assignStudent(classId: string, studentId: string): Promise<void> {
		await this.prisma.studentProfile.update({
			where: { userId: studentId },
			data: { classId }
		});
	}
}