import { PrismaClient } from '@prisma/client';

export async function seedSystemSettings(prisma: PrismaClient) {
	console.log('Seeding system settings...');

	const systemSettings = await prisma.systemSettings.upsert({
		where: { id: 1 },
		update: {},
		create: {
			mfaEnabled: false,
			emailNotifications: true,
			autoBackup: false,
			maintenanceMode: false
		}
	});

	console.log('System settings seeded successfully');
	return systemSettings;
}