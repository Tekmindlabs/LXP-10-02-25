import { PrismaClient } from '@prisma/client';

export async function seedBrandingSettings(prisma: PrismaClient) {
	console.log('Seeding branding settings...');

	const brandingSettings = await prisma.brandingSettings.upsert({
		where: { id: 1 },
		update: {},
		create: {
			logo: null,
			primaryColor: '#000000',
			secondaryColor: '#ffffff',
			accentColor: '#0000ff',
			fontFamily: 'Inter',
			customCss: null
		}
	});

	console.log('Branding settings seeded successfully');
	return brandingSettings;
}
