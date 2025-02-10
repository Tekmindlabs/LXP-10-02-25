import { PrismaClient, Status } from '@prisma/client';
import { ClassGroup } from '@prisma/client';

export async function seedClasses(prisma: PrismaClient, classGroups: ClassGroup[]) {
	console.log('Creating demo classes...');

	const classesData = [
		// Elementary Classes
		{
			name: 'Grade 1',
			classGroupId: classGroups[0].id,
			capacity: 30,
			description: 'First grade'
		},
		// Middle School Classes
		{
			name: 'Grade 7',
			classGroupId: classGroups[1].id,
			capacity: 35,
			description: 'Seventh grade'
		},
		// High School Classes
		{
			name: 'Grade 10',
			classGroupId: classGroups[2].id,
			capacity: 40,
			description: 'Tenth grade'
		}
	];


	const classes = await Promise.all(
		classesData.map(classData =>
			prisma.class.upsert({
				where: {
					name_classGroupId: {
						name: classData.name,
						classGroupId: classData.classGroupId
					}
				},
				update: {
					capacity: classData.capacity
				},
				create: {
					name: classData.name,
					classGroupId: classData.classGroupId,
					capacity: classData.capacity,
					status: Status.ACTIVE
				}
			})
		)
	);

	// Assign students to classes
	const students = await prisma.studentProfile.findMany({
		include: { user: true }
	});

	if (students.length > 0) {
		// Distribute students across classes
		await Promise.all(
			students.map(async (student, index) => {
				const classIndex = index % classes.length;
				await prisma.studentProfile.update({
					where: { id: student.id },
					data: {
						classId: classes[classIndex].id
					}
				});
			})
		);
	}

	// Assign teachers to classes
	const teachers = await prisma.teacherProfile.findMany({
		include: { user: true }
	});

	if (teachers.length > 0) {
		await Promise.all(
			classes.map(async (class_, index) => {
				const teacher = teachers[index % teachers.length];
				await prisma.teacherClass.upsert({
					where: {
						teacherId_classId: {
							teacherId: teacher.id,
							classId: class_.id
						}
					},
					update: {},
					create: {
						teacherId: teacher.id,
						classId: class_.id,
						isClassTeacher: true,
						status: Status.ACTIVE
					}
				});
			})
		);
	}

	console.log('Classes seeded successfully');
	return classes;
}