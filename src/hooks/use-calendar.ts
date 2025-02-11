import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import type { CalendarEvent } from '@/types/calendar';

interface UseCalendarProps {
	entityId: string;
	entityType: 'class' | 'class_group';
}

export function useCalendar({ entityId, entityType }: UseCalendarProps) {
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const utils = api.useContext();
	const { data: calendarEvents, isLoading: eventsLoading } = api.calendar.getEvents.useQuery({
		entityId,
		entityType
	});

	const createEvent = api.calendar.createEvent.useMutation({
		onSuccess: () => {
			utils.calendar.getEvents.invalidate();
		}
	});

	const updateEvent = api.calendar.updateEvent.useMutation({
		onSuccess: () => {
			utils.calendar.getEvents.invalidate();
		}
	});

	const deleteEvent = api.calendar.deleteEvent.useMutation({
		onSuccess: () => {
			utils.calendar.getEvents.invalidate();
		}
	});

	useEffect(() => {
		if (calendarEvents) {
			// Transform null values to undefined for optional fields and ensure correct level type
			const transformedEvents = calendarEvents.map(event => ({
				...event,
				description: event.description || undefined,
				programId: event.programId || undefined,
				classGroupId: event.classGroupId || undefined,
				classId: event.classId || undefined,
				level: event.level as 'class' | 'class_group'
			})) satisfies CalendarEvent[];
			setEvents(transformedEvents);
		}
		setIsLoading(eventsLoading);
	}, [calendarEvents, eventsLoading]);

	const handleEventCreate = async (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
		await createEvent.mutateAsync({
			...event,
			level: entityType
		});
	};

	const handleEventUpdate = async (event: CalendarEvent) => {
		await updateEvent.mutateAsync(event);
	};

	const handleEventDelete = async (eventId: string) => {
		await deleteEvent.mutateAsync({ eventId });
	};

	return {
		events,
		isLoading,
		createEvent: handleEventCreate,
		updateEvent: handleEventUpdate,
		deleteEvent: handleEventDelete
	};
}