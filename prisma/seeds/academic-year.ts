import { PrismaClient, Status } from '@prisma/client';

export async function seedAcademicYear(prisma: PrismaClient) {
	console.log('Seeding academic year settings and data...');

	// Create academic year settings
	const settings = await prisma.academicYearSettings.create({
		data: {
			startMonth: 8,  // August
			startDay: 1,
			endMonth: 5,   // May
			endDay: 31
		}
	});

	// Create academic year
	const academicYear = await prisma.academicYear.upsert({
		where: { name: '2024-2025' },
		update: {},
		create: {
			name: '2024-2025',
			startDate: new Date('2024-08-01'),
			endDate: new Date('2025-05-31'),
			status: Status.ACTIVE
		}
	});

	console.log('Academic year settings and data seeded successfully');
	return academicYear;
}

