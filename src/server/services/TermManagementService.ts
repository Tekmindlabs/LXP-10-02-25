import { PrismaClient as PrismaClientType, Status as StatusType, Prisma } from "@prisma/client";
import type { AcademicTerm, TermAssessmentPeriod } from "@/types/terms";
import type { CalendarEvent } from "@/types/calendar";
import { CustomSettings, CustomTerm } from "@/types/terms";

type PrismaClient = PrismaClientType;

interface ProgramTermStructure {
	id: string;
	programId: string;
	academicYearId: string;
	academicTerms: AcademicTerm[];
	name: string;
	status: StatusType;
	startDate: Date;
	endDate: Date;
	weight: number;
	order: number;
	createdAt: Date;
	updatedAt: Date;
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
				status: StatusType.ACTIVE,
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
			classGroups.map((group: { id: string }) =>
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

		return await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
			// First, delete existing assessment periods
			await tx.termAssessmentPeriod.deleteMany({
				where: {
					termId: {
						in: programTerm.academicTerms.map(term => term.id)
					}
				}
			});

			// Then delete existing academic terms
			await tx.academicTerm.deleteMany({
				where: {
					termStructureId: programTerm.id
				}
			});

			// Finally, create new terms with their assessment periods
			const updatedTerms = await tx.programTermStructure.update({
				where: { id: programTerm.id },
				data: {
					academicTerms: {
						create: updates.terms.map(term => ({
							name: term.name,
							startDate: term.startDate,
							endDate: term.endDate,
							type: term.type,
							term: {
								connect: { id: term.calendarTermId }
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
				const termMap = new Map(updates.terms.map(t => [t.calendarTermId, t.type]));
				await this.propagateTermUpdatesToClassGroups(
					programId,
					updatedTerms.academicTerms.map((academicTerm: {
						id: string;
						name: string;
						term: { id: string; startDate: Date; endDate: Date };
						assessmentPeriods: TermAssessmentPeriod[];
					}) => ({
						id: academicTerm.id,
						name: academicTerm.name,
						startDate: academicTerm.term.startDate,
						endDate: academicTerm.term.endDate,
						type: termMap.get(academicTerm.term.id) || 'SEMESTER', // Default to SEMESTER if not found
						calendarTermId: academicTerm.term.id,
						assessmentPeriods: academicTerm.assessmentPeriods
					})) as AcademicTerm[]
				);
		}

		return updatedTerms;
	});
	}

    async createClassGroupCalendar(classGroupId: string) {
        const terms = await this.getClassGroupTerms(classGroupId);
        const classGroup = await this.db.classGroup.findUnique({
            where: { id: classGroupId },
            include: { program: true }
        });

        if (!classGroup) throw new Error("Class group not found");

        const calendarEvents = terms.map(term => ({
            title: `${term.name} Term`,
            description: `Academic term for ${classGroup.name}`,
            startDate: term.startDate,
            endDate: term.endDate,
            level: 'class_group',
            calendarId: classGroupId,
            classGroupId: classGroupId,
            programId: classGroup.programId,
            status: 'ACTIVE' as const
        }));

        await this.db.calendarEvent.createMany({
            data: calendarEvents
        });

        // Create assessment period events
        const assessmentEvents = terms.flatMap(term => 
            term.assessmentPeriods.map(period => ({
                title: `${period.name} - ${term.name}`,
                description: `Assessment period for ${term.name}`,
                startDate: period.startDate,
                endDate: period.endDate,
                level: 'class_group',
                calendarId: classGroupId,
                classGroupId: classGroupId,
                programId: classGroup.programId,
                status: 'ACTIVE' as const
            }))
        );

        await this.db.calendarEvent.createMany({
            data: assessmentEvents
        });

        return [...calendarEvents, ...assessmentEvents];
    }

async createClassCalendar(classId: string) {
	const classData = await this.db.class.findUnique({
		where: { id: classId },
		include: { 
			classGroup: true
		}
	});

	if (!classData) throw new Error("Class not found");

	// Inherit events from class group
	const classGroupEvents = await this.db.calendarEvent.findMany({
		where: { classGroupId: classData.classGroupId }
	});

	const classEvents = classGroupEvents.map((event: {
		title: string;
		description: string | null;
		startDate: Date;
		endDate: Date;
		status: StatusType;
		programId: string | null;
	}) => ({
		title: event.title,
		description: event.description,
		startDate: event.startDate,
		endDate: event.endDate,
		level: 'class' as const,
		calendarId: classId,
		classId: classId,
		status: event.status,
		programId: event.programId
	}));

	await this.db.calendarEvent.createMany({
		data: classEvents
	});

	return classEvents;
}


    async updateCalendarEvents(entityId: string, entityType: 'class' | 'class_group', updates: CalendarEvent[]) {
        const whereClause = entityType === 'class' 
            ? { classId: entityId }
            : { classGroupId: entityId };

        await this.db.calendarEvent.deleteMany({
            where: whereClause
        });

        return await this.db.calendarEvent.createMany({
            data: updates
        });
    }

	private async propagateTermUpdatesToClassGroups(programId: string, terms: AcademicTerm[]) {
		const classGroups = await this.db.classGroup.findMany({
			where: { 
				programId,
				status: StatusType.ACTIVE,
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
			classGroups.map((group: { id: string }) => 
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

	async inheritClassGroupTerms(
		classGroupId: string,
		_classId: string  // Prefix with _ to indicate it's unused
	): Promise<ProgramTermStructure> {
		const classGroup = await this.db.classGroup.findUnique({
			where: { id: classGroupId },
			include: {
				program: {
					include: {
						termStructures: {
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
				},
				termSettings: {
					include: {
						programTerm: true
					}
				}
			}
		});

		if (!classGroup) {
			throw new Error(`ClassGroup with id ${classGroupId} not found`);
		}

		const termSettings = classGroup.termSettings[0];
		const rawProgramTermStructure = termSettings?.programTerm || classGroup.program.termStructures[0];

		if (!rawProgramTermStructure) {
			throw new Error('No term structure found for class group');
		}

		const programTermStructure: ProgramTermStructure = {
			...rawProgramTermStructure,
			academicTerms: (rawProgramTermStructure as any).academicTerms || []
		};


		const customSettings = termSettings?.customSettings ? 
			JSON.parse(termSettings.customSettings as string) as CustomSettings : 
			undefined;

		if (customSettings?.terms) {
			const customizedTerms = this.mergeTermSettings(
				programTermStructure.academicTerms,
				customSettings
			);

			return {
				...programTermStructure,
				academicTerms: customizedTerms
			};
		}

		return programTermStructure;
	}
}
