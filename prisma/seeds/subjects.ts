import { PrismaClient, Status } from '@prisma/client';
import { ClassGroup } from '@prisma/client';

export async function seedSubjects(prisma: PrismaClient, classGroups: ClassGroup[]) {
	console.log('Creating demo subjects...');

	const subjectsData = [
		{
			name: 'Mathematics',
			code: 'MATH101',
			description: 'Core mathematics including algebra, geometry, and basic calculus'
		},
		{
			name: 'Science',
			code: 'SCI101',
			description: 'General science covering physics, chemistry, and biology basics'
		},
		{
			name: 'English',
			code: 'ENG101',
			description: 'English language arts and literature'
		},
		{
			name: 'History',
			code: 'HIST101',
			description: 'World history and social studies'
		},
		{
			name: 'Computer Science',
			code: 'CS101',
			description: 'Introduction to programming and computer concepts'
		}
	];

	const subjects = await Promise.all(
		subjectsData.map(subject =>
			prisma.subject.upsert({
				where: { code: subject.code },
				update: {
					name: subject.name,
					description: subject.description,
					classGroups: {
						connect: classGroups.map(cg => ({ id: cg.id }))
					}
				},
				create: {
					name: subject.name,
					code: subject.code,
					description: subject.description,
					status: Status.ACTIVE,
					classGroups: {
						connect: classGroups.map(cg => ({ id: cg.id }))
					}
				}
			})
		)
	);

	// Assign teachers to subjects
	const teachers = await prisma.teacherProfile.findMany({
		include: { user: true }
	});

	if (teachers.length > 0) {
		await Promise.all(
			subjects.map(async (subject, index) => {
				const teacher = teachers[index % teachers.length];
				await prisma.teacherSubject.upsert({
					where: {
						teacherId_subjectId: {
							teacherId: teacher.id,
							subjectId: subject.id
						}
					},
					update: {},
					create: {
						teacherId: teacher.id,
						subjectId: subject.id,
						status: Status.ACTIVE
					}
				});
			})
		);
	}

	console.log('Subjects seeded successfully');
	return subjects;
}