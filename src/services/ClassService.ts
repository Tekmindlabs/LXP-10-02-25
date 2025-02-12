import { PrismaClient, Status } from '@prisma/client';

interface CreateClassInput {
	name: string;
	classGroupId: string;
	capacity: number;
}

interface GradeBookService {
	initializeGradeBook(classId: string): Promise<void>;
}

interface CalendarService {
	inheritClassGroupCalendar(classGroupId: string, classId: string): Promise<void>;
}

export class ClassService {
	private db: PrismaClient;
	private gradeBookService: GradeBookService;
	private calendarService: CalendarService;

	constructor(
		db: PrismaClient,
		gradeBookService: GradeBookService,
		calendarService: CalendarService
	) {
		this.db = db;
		this.gradeBookService = gradeBookService;
		this.calendarService = calendarService;
	}

	async createClassWithInheritance(data: CreateClassInput) {
		return await this.db.$transaction(async (tx) => {
			// Create class with required capacity
			const newClass = await tx.class.create({
				data: {
					name: data.name,
					classGroupId: data.classGroupId,
					capacity: data.capacity,
					status: 'ACTIVE' as Status
				}
			});

			// Initialize gradebook with inherited settings
			await this.gradeBookService.initializeGradeBook(newClass.id);

			// Set up calendar
			await this.calendarService.inheritClassGroupCalendar(
				data.classGroupId, 
				newClass.id
			);

			return newClass;
		});
	}
}