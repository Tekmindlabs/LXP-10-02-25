import { PrismaClient, Status, Prisma } from "@prisma/client";
import type { AcademicTerm, TermAssessmentPeriod, TermType } from "@/types/terms";

interface CustomTerm {
	termId: string;
	startDate: Date;
	endDate: Date;
	assessmentPeriods: TermAssessmentPeriod[];
}

interface CustomSettings {
	terms: CustomTerm[];
}

export class TermManagementService {

	private db: PrismaClient;

	constructor(db: PrismaClient) {
		this.db = db;
	}

	async createProgramTerms(programId: string, academicYearId: string, terms: Omit<AcademicTerm, 'id'>[]) {
		const programTerms = await this.db.programTermStructure.create({
			data: {
				program: { connect: { id: programId } },
				academicYear: { connect: { id: academicYearId } },
				name: "Default Term Structure",
				weight: 1.0,
				order: 1,
				status: Status.ACTIVE,
				startDate: new Date(),
				endDate: new Date(),
				academicTerms: {
					create: terms.map(term => ({
						name: term.name,
						startDate: term.startDate,
						endDate: term.endDate,
						type: term.type,
						term: {
							connect: { id: term.calendarTermId || '' }
						},
						assessmentPeriods: {
							create: term.assessmentPeriods.map(ap => ({
								name: ap.name,
								startDate: ap.startDate,
								endDate: ap.endDate,
								weight: ap.weight
							}))
						}
					}))
				}
			},
			include: {
				academicTerms: {
					include: {
						assessmentPeriods: true,
						term: true
					}
				}
			}
		});

		const classGroups = await this.db.classGroup.findMany({
			where: { programId }
		});

		await Promise.all(
			classGroups.map(group =>
				this.db.classGroupTermSettings.create({
					data: {
						classGroup: { connect: { id: group.id } },
						programTerm: { connect: { id: programTerms.id } }
					}
				})
			)
		);

		return programTerms;
	}

	async getClassGroupTerms(classGroupId: string) {
		const termSettings = await this.db.classGroupTermSettings.findFirst({
			where: { classGroupId },
			include: {
				programTerm: {
					include: {
						academicTerms: {
							include: {
								assessmentPeriods: true,
								term: true
							}
						}
					}
				}
			}
		});

		if (!termSettings) {
			throw new Error("Term settings not found for class group");
		}

		const customSettings = termSettings.customSettings ? 
			JSON.parse(termSettings.customSettings as string) as CustomSettings : 
			undefined;

		return this.mergeTermSettings(
			termSettings.programTerm?.academicTerms as unknown as AcademicTerm[] || [],
			customSettings
		);
	}

	private mergeTermSettings(terms: AcademicTerm[], customSettings?: CustomSettings): AcademicTerm[] {
		if (!customSettings?.terms) {
			return terms;
		}

		return terms.map(term => {
			const customTerm = customSettings.terms.find((ct: CustomTerm) => ct.termId === term.id);
			if (customTerm) {
				return {
					...term,
					startDate: new Date(customTerm.startDate),
					endDate: new Date(customTerm.endDate),
					assessmentPeriods: customTerm.assessmentPeriods
				};
			}
			return term;
		});
	}


	async updateProgramTermSystem(programId: string, updates: {
		terms: AcademicTerm[];
		propagateToClassGroups?: boolean;
	}) {
		const programTerm = await this.db.programTermStructure.findFirst({
			where: { programId },
			include: { academicTerms: true }
		});

		if (!programTerm) {
			throw new Error("Program term structure not found");
		}

		const updatedTerms = await this.db.programTermStructure.update({
			where: { id: programTerm.id },
			data: {
				academicTerms: {
					deleteMany: {},
					create: updates.terms.map(term => ({
						name: term.name,
						startDate: term.startDate,
						endDate: term.endDate,
						type: term.type,
						term: {
							connect: { id: term.calendarTermId || '' }
						},
						assessmentPeriods: {
							create: term.assessmentPeriods.map(ap => ({
								name: ap.name,
								startDate: ap.startDate,
								endDate: ap.endDate,
								weight: ap.weight
							}))
						}
					}))
				}
			},
			include: {
				academicTerms: {
					include: {
						assessmentPeriods: true,
						term: true,
						termStructure: true
					}
				}
			}
		});

		if (updates.propagateToClassGroups && updatedTerms.academicTerms) {
			await this.propagateTermUpdatesToClassGroups(
				programId, 
				updatedTerms.academicTerms.map(academicTerm => ({
					id: academicTerm.id,
					name: academicTerm.name,
					startDate: academicTerm.term.startDate,
					endDate: academicTerm.term.endDate,
					type: academicTerm.term.type as TermType,
					calendarTermId: academicTerm.termId,
					assessmentPeriods: academicTerm.assessmentPeriods
				})) as AcademicTerm[]
			);
		}

		return updatedTerms;
	}

	private async propagateTermUpdatesToClassGroups(programId: string, terms: AcademicTerm[]) {
		const classGroups = await this.db.classGroup.findMany({
			where: { 
				programId,
				status: Status.ACTIVE,
				termSettings: {
					every: {
						customSettings: {
							equals: Prisma.JsonNull
						}
					}
				}
			}
		});

		return Promise.all(
			classGroups.map(group => 
				this.db.classGroupTermSettings.updateMany({
					where: { 
						classGroupId: group.id,
						customSettings: {
							equals: Prisma.JsonNull
						}
					},
					data: {
						customSettings: JSON.stringify({
							terms: terms.map(term => ({
								termId: term.id,
								startDate: term.startDate,
								endDate: term.endDate,
								assessmentPeriods: term.assessmentPeriods
							}))
						})
					}
				})
			)
		);
	}
}
