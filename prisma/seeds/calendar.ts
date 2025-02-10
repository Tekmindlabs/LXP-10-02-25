import { PrismaClient, Status, EventType, CalendarType, Visibility, Priority } from '@prisma/client';

export async function seedCalendar(prisma: PrismaClient, academicYearId: string) {
	console.log('Creating demo calendar...');
	
	// Create Calendar
	const calendar = await prisma.calendar.upsert({
		where: {
			name_type: {
				name: "2024-2025 Academic Calendar",
				type: CalendarType.PRIMARY
			}
		},
		update: {
			academicYearId,
			description: 'Main academic calendar for 2024-2025',
			startDate: new Date('2024-08-01'),
			endDate: new Date('2025-05-31'),
			status: Status.ACTIVE,
			isDefault: true,
			visibility: Visibility.ALL,
			metadata: {
				academicYear: '2024-2025',
				semester: 'BOTH',
				terms: 2
			}
		},
		create: {
			academicYearId,
			name: '2024-2025 Academic Calendar',
			description: 'Main academic calendar for 2024-2025',
			startDate: new Date('2024-08-01'),
			endDate: new Date('2025-05-31'),
			type: CalendarType.PRIMARY,
			status: Status.ACTIVE,
			isDefault: true,
			visibility: Visibility.ALL,
			metadata: {
				academicYear: '2024-2025',
				semester: 'BOTH',
				terms: 2
			}
		}
	});

	console.log('Creating calendar events...');
	const events = [
		// Academic Events
		{
			title: 'First Day of School',
			description: 'Opening ceremony and first day of classes',
			eventType: EventType.ACADEMIC,
			startDate: new Date('2024-08-01'),
			endDate: new Date('2024-08-01'),
			priority: Priority.HIGH,
			visibility: Visibility.ALL
		},
		{
			title: 'Parent-Teacher Conference',
			description: 'Fall semester parent-teacher meetings',
			eventType: EventType.ACADEMIC,
			startDate: new Date('2024-10-10'),
			endDate: new Date('2024-10-11'),
			priority: Priority.HIGH,
			visibility: Visibility.ALL
		},
		// Holidays
		{
			title: 'Fall Break',
			description: 'Fall semester break',
			eventType: EventType.HOLIDAY,
			startDate: new Date('2024-10-14'),
			endDate: new Date('2024-10-18'),
			priority: Priority.MEDIUM,
			visibility: Visibility.ALL
		},
		{
			title: 'Winter Break',
			description: 'Winter holiday break',
			eventType: EventType.HOLIDAY,
			startDate: new Date('2024-12-23'),
			endDate: new Date('2025-01-03'),
			priority: Priority.MEDIUM,
			visibility: Visibility.ALL
		},
		// Exams
		{
			title: 'Mid-Term Exams',
			description: 'Fall semester mid-term examinations',
			eventType: EventType.EXAM,
			startDate: new Date('2024-10-07'),
			endDate: new Date('2024-10-11'),
			priority: Priority.HIGH,
			visibility: Visibility.ALL
		},
		{
			title: 'Final Exams',
			description: 'Fall semester final examinations',
			eventType: EventType.EXAM,
			startDate: new Date('2024-12-16'),
			endDate: new Date('2024-12-20'),
			priority: Priority.HIGH,
			visibility: Visibility.ALL
		}
	];

	await Promise.all(
		events.map(event =>
			prisma.event.upsert({
				where: {
					title_calendarId_eventType: {
						title: event.title,
						calendarId: calendar.id,
						eventType: event.eventType
					}
				},
				update: event,
				create: {
					...event,
					calendarId: calendar.id,
					status: Status.ACTIVE,
					metadata: {
						category: event.eventType,
						location: 'School Campus'
					}
				}
			})
		)
	);

	// Create Terms
	const terms = [
		{
			name: 'Fall Semester 2024',
			startDate: new Date('2024-08-01'),
			endDate: new Date('2024-12-20'),
			gradingPeriods: [
				{
					name: 'Fall Quarter 1',
					startDate: new Date('2024-08-01'),
					endDate: new Date('2024-10-04'),
					weight: 50
				},
				{
					name: 'Fall Quarter 2',
					startDate: new Date('2024-10-21'),
					endDate: new Date('2024-12-20'),
					weight: 50
				}
			]
		},
		{
			name: 'Spring Semester 2025',
			startDate: new Date('2025-01-06'),
			endDate: new Date('2025-05-31'),
			gradingPeriods: [
				{
					name: 'Spring Quarter 1',
					startDate: new Date('2025-01-06'),
					endDate: new Date('2025-03-14'),
					weight: 50
				},
				{
					name: 'Spring Quarter 2',
					startDate: new Date('2025-03-24'),
					endDate: new Date('2025-05-31'),
					weight: 50
				}
			]
		}
	];

	await Promise.all(
		terms.map(term =>
			prisma.term.upsert({
				where: {
					name_calendarId: {
						name: term.name,
						calendarId: calendar.id
					}
				},
				update: {
					startDate: term.startDate,
					endDate: term.endDate,
					status: Status.ACTIVE,
					gradingPeriods: {
						deleteMany: {},
						create: term.gradingPeriods.map(period => ({
							...period,
							status: Status.ACTIVE
						}))
					}
				},
				create: {
					name: term.name,
					startDate: term.startDate,
					endDate: term.endDate,
					calendarId: calendar.id,
					status: Status.ACTIVE,
					gradingPeriods: {
						create: term.gradingPeriods.map(period => ({
							...period,
							status: Status.ACTIVE
						}))
					}
				}
			})
		)
	);

	console.log('Calendar data seeded successfully');
	return calendar;
}