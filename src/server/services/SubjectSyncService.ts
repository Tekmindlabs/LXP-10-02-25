import { PrismaClient, Subject, TeacherAssignment } from '@prisma/client';
import { subjectCache } from '@/lib/cache/subject-cache';

export class SubjectSyncService {
	constructor(private prisma: PrismaClient) {}

	async syncClassSubjects(classGroupId: string): Promise<void> {
		const classGroup = await this.prisma.classGroup.findUnique({
			where: { id: classGroupId },
			include: { 
				subjects: true,
				classes: true 
			}
		});

		if (!classGroup) return;

		// Clear existing teacher assignments for these classes
		await this.prisma.teacherAssignment.deleteMany({
			where: {
				classId: {
					in: classGroup.classes.map(c => c.id)
				}
			}
		});

		// Create new teacher assignments for each class and subject
		for (const cls of classGroup.classes) {
			await this.prisma.teacherAssignment.createMany({
				data: classGroup.subjects.map(subject => ({
					subjectId: subject.id,
					classId: cls.id,
					teacherId: '', // This will be assigned when a teacher is selected
					isClassTeacher: false
				}))
			});
		}

		// Update cache for each subject
		classGroup.subjects.forEach(subject => {
			subjectCache.set(subject.id, subject);
		});
	}

	async trackSubjectChanges(classGroupId: string, changes: any): Promise<void> {
		await this.prisma.versionedRecord.create({
			data: {
				entityId: classGroupId,
				entityType: 'SUBJECT_CHANGE',
				changes,
				timestamp: new Date(),
				userId: '', // This should be the current user's ID
			}
		});
	}

	async getClassSubjects(classId: string): Promise<Subject[]> {
		const assignments = await this.prisma.teacherAssignment.findMany({
			where: { classId },
			include: { subject: true }
		});

		const subjects = assignments.map(a => a.subject);
		subjects.forEach(subject => {
			subjectCache.set(subject.id, subject);
		});

		return subjects;
	}
}
