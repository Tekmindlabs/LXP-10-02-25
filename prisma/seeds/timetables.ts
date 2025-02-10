import { PrismaClient } from '@prisma/client';
import { ClassGroup, Class, Subject, Classroom } from '@prisma/client';

const breakTimeSlots = [
	{ start: '10:15', end: '10:30', type: 'SHORT_BREAK' as const },
	{ start: '12:45', end: '13:45', type: 'LUNCH_BREAK' as const },
	{ start: '14:45', end: '15:00', type: 'SHORT_BREAK' as const }
];

interface TimetableParams {
	classGroups: ClassGroup[];
	classes: Class[];
	subjects: Subject[];
	classrooms: Classroom[];
}

export async function seedTimetables(prisma: PrismaClient, params: TimetableParams) {
	console.log('Creating timetables and periods...');

	// Delete all existing timetables first to ensure clean state
	await prisma.timetable.deleteMany();

	const teachers = await prisma.teacherProfile.findMany({
		include: {
			user: true,
			subjects: true
		}
	});

	if (teachers.length === 0) {
		throw new Error("No teachers found in the database");
	}

	// Get active term
	const activeTerm = await prisma.term.findFirst({
		where: {
			name: 'Fall Semester 2024',
			status: 'ACTIVE'
		}
	});

	if (!activeTerm) {
		throw new Error("Active term not found");
	}

	// Create one timetable per class
	const timetables = await Promise.all(
		params.classes.map(async (class_) => {
			const classGroup = params.classGroups.find(cg => cg.id === class_.classGroupId);
			if (!classGroup) return null;

			return prisma.timetable.create({
				data: {
					termId: activeTerm.id,
					classGroupId: classGroup.id,
					classId: class_.id
				}
			});
		})
	);


	const validTimetables = timetables.filter((t): t is NonNullable<typeof t> => t !== null);

	// Create periods for each timetable
	console.log('Creating periods...');
	
	const timeSlots = [
		{ start: '08:00', end: '09:00' },
		{ start: '09:15', end: '10:15' },
		{ start: '10:30', end: '11:30' },
		{ start: '11:45', end: '12:45' },
		{ start: '13:45', end: '14:45' },
		{ start: '15:00', end: '16:00' }
	];

	for (const timetable of validTimetables) {
		if (!timetable) continue; // Add null check
		// Create periods for Monday to Friday (1-5)
		for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
			await Promise.all(
				timeSlots.map(async (slot, index) => {
					const subject = params.subjects[index % params.subjects.length];
					const teacher = teachers.find(t => 
						t.subjects.some(s => s.subjectId === subject.id)
					) || teachers[index % teachers.length];
					const classroom = params.classrooms[index % params.classrooms.length];

					const [startHour, startMinute] = slot.start.split(':').map(Number);
					const [endHour, endMinute] = slot.end.split(':').map(Number);

					const startTime = new Date();
					startTime.setHours(startHour, startMinute, 0);

					const endTime = new Date();
					endTime.setHours(endHour, endMinute, 0);

					const durationInMinutes = 
						(endTime.getHours() * 60 + endTime.getMinutes()) -
						(startTime.getHours() * 60 + startTime.getMinutes());

					await prisma.period.upsert({
						where: {
							timetableId_dayOfWeek_startTime: {
								timetableId: timetable.id,
								dayOfWeek,
								startTime
							}
						},
						update: {},
						create: {
							startTime,
							endTime,
							dayOfWeek,
							durationInMinutes,
							subjectId: subject.id,
							classroomId: classroom.id,
							timetableId: timetable.id,
							teacherId: teacher.id
						}
					});
				})
			);
		}
	}

	// Add break times
	console.log('Creating break times...');
	for (const timetable of validTimetables) {
		if (!timetable) continue;

		for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
			await Promise.all(
				breakTimeSlots.map(async (slot) => {
					const [startHour, startMinute] = slot.start.split(':').map(Number);
					const [endHour, endMinute] = slot.end.split(':').map(Number);

					const durationInMinutes = 
						(endHour * 60 + endMinute) -
						(startHour * 60 + startMinute);

					await prisma.breakTime.upsert({
						where: {
							timetableId_dayOfWeek_startTime: {
								timetableId: timetable.id,
								dayOfWeek,
								startTime: slot.start
							}
						},
						update: {},
						create: {
							startTime: slot.start,
							endTime: slot.end,
							type: slot.type,
							dayOfWeek,
							timetableId: timetable.id
						}
					});


				})
			);
		}
	}

	console.log('Timetables, periods and break times seeded successfully');
	return timetables;
}