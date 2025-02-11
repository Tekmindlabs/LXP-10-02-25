import { PrismaClient } from "@prisma/client";

export class SubjectSyncService {
	private prisma: PrismaClient;

	constructor(prisma: PrismaClient) {
		this.prisma = prisma;
	}

	async syncSubjects(classGroupId: string, subjects: string[]) {
		// Get current subjects
		const currentSubjects = await this.prisma.subject.findMany({
			where: {
				classGroups: {
					some: {
						id: classGroupId
					}
				}
			}
		});

		// Create new subjects if needed
		const newSubjects = subjects.filter(subjectId => 
			!currentSubjects.some(cs => cs.id === subjectId)
		);

		if (newSubjects.length > 0) {
			await this.prisma.classGroup.update({
				where: { id: classGroupId },
				data: {
					subjects: {
						connect: newSubjects.map(id => ({ id }))
					}
				}
			});
		}

		// Remove subjects that are no longer needed
		const removedSubjects = currentSubjects
			.filter(cs => !subjects.includes(cs.id))
			.map(s => s.id);

		if (removedSubjects.length > 0) {
			await this.prisma.classGroup.update({
				where: { id: classGroupId },
				data: {
					subjects: {
						disconnect: removedSubjects.map(id => ({ id }))
					}
				}
			});
		}

		return {
			added: newSubjects.length,
			removed: removedSubjects.length
		};
	}
}

