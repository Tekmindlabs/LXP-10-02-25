import { PrismaClient, ProgramTermStructure, Status } from '@prisma/client';
import { db } from '@/lib/db';
import { TermManagementService } from './TermManagementService';
import type { AcademicTerm } from '@/types/terms';

export class TermStructureService {
	private prisma: PrismaClient;
	private termManagement: TermManagementService;

	constructor() {
		this.prisma = db;
		this.termManagement = new TermManagementService(db);
	}

	async createTermStructure(data: {
		name: string;
		programId: string;
		academicYearId: string;
		startDate: Date;
		endDate: Date;
		weight: number;
		order: number;
	}): Promise<ProgramTermStructure> {
		// Use TermManagementService to create term structure
		const terms = await this.termManagement.createProgramTerms(
			data.programId,
			data.academicYearId,
			[{
				name: data.name,
				startDate: data.startDate,
				endDate: data.endDate,
				type: 'SEMESTER',
				calendarTermId: '',
				assessmentPeriods: []
			} as Omit<AcademicTerm, 'id'>]
		);
		return terms;
	}

	async getTermStructureById(id: string): Promise<ProgramTermStructure | null> {
		return await this.prisma.programTermStructure.findUnique({
			where: { id },
			include: {
				program: true,
				academicYear: true,
				academicTerms: {
					include: {
						term: true,
						assessmentPeriods: true
					}
				}
			}
		});
	}

	async updateTermStructure(
		id: string,
		data: Partial<ProgramTermStructure>
	): Promise<ProgramTermStructure> {
		return await this.prisma.programTermStructure.update({
			where: { id },
			data
		});
	}

	async deleteTermStructure(id: string): Promise<void> {
		await this.prisma.programTermStructure.update({
			where: { id },
			data: { status: Status.ARCHIVED }
		});
	}

	async getTermStructuresForProgram(programId: string): Promise<ProgramTermStructure[]> {
		return await this.prisma.programTermStructure.findMany({
			where: {
				programId,
				status: Status.ACTIVE
			},
			orderBy: { order: 'asc' },
			include: {
				academicTerms: {
					include: {
						term: true,
						assessmentPeriods: true
					}
				}
			}
		});
	}

	async assignTermStructureToClass(
		classId: string,
		termStructureId: string
	): Promise<void> {
		await this.prisma.class.update({
			where: { id: classId },
			data: { termStructureId }
		});

		// Update gradebook term structure
		await this.prisma.gradeBook.update({
			where: { classId },
			data: { termStructureId }
		});
	}
}