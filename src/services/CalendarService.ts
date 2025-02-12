import { PrismaClient, Status } from '@prisma/client';

interface CalendarEvent {
	id: string;
	title: string;
	description: string | null;
	startDate: Date;
	endDate: Date;
	classGroupId: string | null;
	classId: string | null;
	status: Status;
}

export class CalendarService {
	private db: PrismaClient;

	constructor(db: PrismaClient) {
		this.db = db;
	}

	async inheritClassGroupCalendar(
		classGroupId: string,
		classId: string
	): Promise<void> {
		// Fetch class group calendar events
		const classGroupEvents = await this.db.calendarEvent.findMany({
			where: {
				classGroupId,
				status: 'ACTIVE'
			}
		});

		// Create inherited events for the class
		await Promise.all(
			classGroupEvents.map(event => 
				this.db.calendarEvent.create({
					data: {
						title: event.title,
						description: event.description,
						startDate: event.startDate,
						endDate: event.endDate,
						classId: classId,
						inheritedFromId: event.id,
						status: 'ACTIVE' as Status
					}
				})
			)
		);
	}
}