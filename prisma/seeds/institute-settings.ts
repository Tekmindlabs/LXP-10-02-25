import { PrismaClient } from '@prisma/client';

export async function seedInstituteSettings(prisma: PrismaClient) {
	console.log('Seeding institute settings...');

	const instituteSettings = await prisma.instituteSettings.upsert({
		where: { id: 1 },
		update: {},
		create: {
			name: 'Demo Institute',
			address: '123 Education Street',
			phone: '+1234567890',
			email: 'contact@demo-institute.com',
			website: 'https://demo-institute.com',
			logo: null,
			timezone: 'UTC',
			academicYearStart: new Date('2025-01-01'),
			academicYearEnd: new Date('2025-12-31')
		}
	});

	console.log('Institute settings seeded successfully');
	return instituteSettings;
}