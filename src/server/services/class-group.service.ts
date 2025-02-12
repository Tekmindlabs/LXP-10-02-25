import { PrismaClient, ClassGroup, Status } from '@prisma/client';
import { db } from '@/lib/db';

export class ClassGroupService {
	private prisma: PrismaClient;

	constructor() {
		this.prisma = db;
	}

	async createClassGroup(data: {
		name: string;
		description?: string;
		programId: string;
		calendarId: string;
	}): Promise<ClassGroup> {
		return await this.prisma.classGroup.create({
			data: {
				...data,
				status: Status.ACTIVE
			}
		});
	}

	async getClassGroupSettings(classGroupId: string) {
		const classGroup = await this.prisma.classGroup.findUnique({
			where: { id: classGroupId },
			include: {
				program: {
					include: {
						assessmentSystem: true,
						termStructures: true
					}
				},
				assessmentSettings: true,
				termSettings: true
			}
		});

		if (!classGroup) throw new Error('Class group not found');

		return {
			assessmentSystem: classGroup.program.assessmentSystem,
			termStructures: classGroup.program.termStructures,
			customAssessmentSettings: classGroup.assessmentSettings,
			customTermSettings: classGroup.termSettings
		};
	}

	async updateClassGroupSettings(
		classGroupId: string,
		assessmentSystemId: string,
		customSettings?: any
	): Promise<void> {
		await this.prisma.classGroupAssessmentSettings.upsert({
			where: {
				classGroupId_assessmentSystemId: {
					classGroupId,
					assessmentSystemId
				}
			},
			create: {
				classGroupId,
				assessmentSystemId,
				customSettings,
				isCustomized: !!customSettings
			},
			update: {
				customSettings,
				isCustomized: !!customSettings
			}
		});
	}

	async updateTermSettings(
		classGroupId: string,
		programTermId: string,
		customSettings?: any
	): Promise<void> {
		await this.prisma.classGroupTermSettings.upsert({
			where: {
				id: `${classGroupId}_${programTermId}`
			},
			create: {
				classGroupId,
				programTermId,
				customSettings,
				isCustomized: !!customSettings
			},
			update: {
				customSettings,
				isCustomized: !!customSettings
			}
		});
	}

	async getInheritedSettings(classGroupId: string) {
		const settings = await this.getClassGroupSettings(classGroupId);
		return {
			assessmentSystem: settings.assessmentSystem,
			termStructures: settings.termStructures,
			assessmentSettings: settings.customAssessmentSettings?.length 
				? settings.customAssessmentSettings[0].customSettings 
				: null,
			termSettings: settings.customTermSettings?.reduce((acc: any, setting: any) => {
				acc[setting.programTermId] = setting.customSettings;
				return acc;
			}, {})
		};
	}
}