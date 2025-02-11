import { PrismaClient } from "@prisma/client";
import type { CalendarEvent } from "@/types/calendar";

export class CalendarInheritanceError extends Error {
	constructor(
		public readonly type: 'INVALID_INHERITANCE' | 'CONFLICT' | 'PERMISSION',
		message: string
	) {
		super(message);
		this.name = 'CalendarInheritanceError';
	}
}

interface InheritanceChain {
	program: string;
	classGroup: string;
	class?: string;
}

interface InheritanceSettings {
	propagateToChildren: boolean;
	overrideParentSettings: boolean;
}

export class CalendarInheritanceService {
	constructor(private db: PrismaClient) {}

	async validateInheritanceChain(chain: InheritanceChain): Promise<boolean> {
		const program = await this.db.program.findUnique({
			where: { id: chain.program },
			include: { classGroups: true }
		});

		if (!program) {
			throw new CalendarInheritanceError('INVALID_INHERITANCE', 'Program not found');
		}

		const classGroup = program.classGroups.find(g => g.id === chain.classGroup);
		if (!classGroup) {
			throw new CalendarInheritanceError('INVALID_INHERITANCE', 'Class group not found or not part of program');
		}

		if (chain.class) {
			const classExists = await this.db.class.findFirst({
				where: {
					id: chain.class,
					classGroupId: chain.classGroup
				}
			});
			if (!classExists) {
				throw new CalendarInheritanceError('INVALID_INHERITANCE', 'Class not found or not part of class group');
			}
		}

		return true;
	}

	async resolveCalendarConflicts(
		parentEvents: CalendarEvent[],
		childEvents: CalendarEvent[],
		settings?: InheritanceSettings
	): Promise<CalendarEvent[]> {
		if (!settings?.propagateToChildren) {
			return childEvents;
		}

		const resolvedEvents = [...childEvents];

		for (const parentEvent of parentEvents) {
			const conflictingEvent = childEvents.find(childEvent => 
				this.eventsOverlap(parentEvent, childEvent)
			);

			if (!conflictingEvent || !settings.overrideParentSettings) {
				resolvedEvents.push(parentEvent);
			}
		}

		return resolvedEvents;
	}

	private eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
		const start1 = new Date(event1.startDate);
		const end1 = new Date(event1.endDate);
		const start2 = new Date(event2.startDate);
		const end2 = new Date(event2.endDate);

		return start1 <= end2 && end1 >= start2;
	}

	async propagateEventToChildren(
		event: CalendarEvent,
		classGroupId: string
	): Promise<void> {
		const classes = await this.db.class.findMany({
			where: { classGroupId }
		});

		const classEvents = classes.map(cls => ({
			...event,
			id: undefined,
			level: 'class' as const,
			classId: cls.id,
			classGroupId: undefined
		}));

		await this.db.calendarEvent.createMany({
			data: classEvents
		});
	}
}