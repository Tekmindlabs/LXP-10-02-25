import { PrismaClient, Prisma } from '@prisma/client';

interface AssessmentSystemConfig {
	id: string;
	type: string;
	settings: Record<string, any>;
}

export class AssessmentSystemInheritanceService {
	constructor(private db: PrismaClient) {}

	async resolveAssessmentSystem(programId: string): Promise<AssessmentSystemConfig> {
		const program = await this.db.program.findUnique({
			where: { id: programId },
			include: {
				assessmentSystem: true
			}
		});

		if (!program?.assessmentSystem) {
			throw new Error(`No assessment system found for program ${programId}`);
		}

		const baseConfig = {
			id: program.assessmentSystem.id,
			type: program.assessmentSystem.type,
			settings: program.assessmentSystem.cgpaConfig as Record<string, any> || {}
		};

		return baseConfig;
	}

	async getClassGroupOverrides(classGroupId: string): Promise<Record<string, any> | null> {
		const settings = await this.db.classGroupAssessmentSettings.findFirst({
			where: { classGroupId }
		});

		if (!settings?.customSettings || !settings.isCustomized) {
			return null;
		}

		return settings.customSettings as Record<string, any>;
	}

	async mergeAssessmentSettings(
		baseConfig: AssessmentSystemConfig,
		classGroupId?: string
	): Promise<AssessmentSystemConfig> {
		let mergedConfig = { ...baseConfig };

		if (classGroupId) {
			const groupOverrides = await this.getClassGroupOverrides(classGroupId);
			if (groupOverrides) {
				mergedConfig = {
					...mergedConfig,
					settings: {
						...mergedConfig.settings,
						...groupOverrides
					}
				};
			}
		}

		return mergedConfig;
	}
}
