'use client';

import { useState, useEffect } from 'react';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CalendarEvent } from '@/types/calendar';
import { DateRange } from 'react-day-picker';

interface AcademicCalendarProps {
	entityId: string;
	entityType: 'class' | 'class_group';
	events?: CalendarEvent[];
	onEventCreate?: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
	onEventUpdate?: (event: CalendarEvent) => Promise<void>;
	onEventDelete?: (eventId: string) => Promise<void>;
}

export function AcademicCalendar({
	entityId,
	entityType,
	events = [],
	onEventCreate,
	onEventUpdate,
	onEventDelete
}: AcademicCalendarProps) {
	const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({ 
		from: new Date(),
		to: new Date() 
	});
	const [displayEvents, setDisplayEvents] = useState<CalendarEvent[]>([]);

	useEffect(() => {
		setDisplayEvents(events);
	}, [events]);

	const getEventsForDate = (date: Date) => {
		return displayEvents.filter(event => {
			const eventStart = new Date(event.startDate);
			const eventEnd = new Date(event.endDate);
			return date >= eventStart && date <= eventEnd;
		});
	};

	return (
		<Card className="p-4">
			<div className="flex justify-between mb-4">
				{onEventCreate && (
					<Button onClick={() => onEventCreate({
						title: 'New Event',
						startDate: selectedRange?.from || new Date(),
						endDate: selectedRange?.to || new Date(),
						level: entityType,
						calendarId: entityId,
						[entityType === 'class' ? 'classId' : 'classGroupId']: entityId,
						status: 'ACTIVE',
						description: ''
					})}>
						Add Event
					</Button>
				)}
			</div>
			
			<CalendarUI
				mode="range"
				selected={selectedRange}
				onSelect={setSelectedRange}
				className="rounded-md border"
			/>


			<div className="mt-4">
				<h3 className="text-lg font-semibold mb-2">Events</h3>
				<div className="space-y-2">
					{getEventsForDate(selectedRange?.from || new Date()).map((event) => (
						<div
							key={event.id}
							className="p-2 border rounded-md flex justify-between items-center"
						>
							<div>
								<h4 className="font-medium">{event.title}</h4>
								<p className="text-sm text-gray-500">
									{new Date(event.startDate).toLocaleDateString()} - 
									{new Date(event.endDate).toLocaleDateString()}
								</p>
							</div>
							<div className="space-x-2">
								{onEventUpdate && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => onEventUpdate(event)}
									>
										Edit
									</Button>
								)}
								{onEventDelete && (
									<Button
										variant="destructive"
										size="sm"
										onClick={() => onEventDelete(event.id)}
									>
										Delete
									</Button>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</Card>
	);
}