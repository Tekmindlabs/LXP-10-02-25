import { ReactNode } from 'react';
import { Period as PrismaPeriod, TeacherProfile, Classroom } from '@prisma/client';
import { BreakTime } from '@/types/timetable';


const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
	const hour = Math.floor(i / 2) + 8;
	const minute = i % 2 === 0 ? "00" : "30";
	return `${hour.toString().padStart(2, "0")}:${minute}`;
});

type PeriodWithRelations = Omit<PrismaPeriod, 'startTime' | 'endTime'> & {
	startTime: Date;
	endTime: Date;
	subject: { name: string };
	teacher: TeacherProfile & { 
		user: { name: string | null } 
	};
	classroom: Classroom;
	timetable: {
		class: {
			name: string;
		};
	};
};

interface WeeklyScheduleViewProps {
	periods: PeriodWithRelations[];
	breakTimes: BreakTime[];
	renderPeriod: (period: PeriodWithRelations) => ReactNode;
	renderBreak: (breakTime: BreakTime) => ReactNode;
}

export type { PeriodWithRelations };

export const WeeklyScheduleView = ({ 
	periods, 
	breakTimes, 
	renderPeriod, 
	renderBreak 
}: WeeklyScheduleViewProps) => {
	const getPeriodsForTimeSlot = (day: number, timeSlot: string): PeriodWithRelations[] => {
		return periods.filter(period => {
			if (period.dayOfWeek !== day) return false;
			
			const slotDateTime = new Date(`1970-01-01T${timeSlot}`);
			const startDateTime = new Date(`1970-01-01T${period.startTime.toTimeString().slice(0, 8)}`);
			const endDateTime = new Date(`1970-01-01T${period.endTime.toTimeString().slice(0, 8)}`);
			
			return slotDateTime >= startDateTime && slotDateTime < endDateTime;
		});
	};

	const getBreakForTimeSlot = (day: number, timeSlot: string) => {
		return breakTimes.find(breakTime => {
			if (breakTime.dayOfWeek !== day) return false;
			
			const slotDateTime = new Date(`1970-01-01T${timeSlot}`);
			const startDateTime = new Date(`1970-01-01T${breakTime.startTime}`);
			const endDateTime = new Date(`1970-01-01T${breakTime.endTime}`);
			
			return slotDateTime >= startDateTime && slotDateTime < endDateTime;
		});
	};

	return (
		<div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] gap-4 p-4">
			<div className="sticky left-0 bg-background/95 backdrop-blur">
				<div className="h-12" /> {/* Header spacer */}
				{TIME_SLOTS.map((time) => (
					<div key={time} className="h-24 flex items-center justify-end pr-4 text-sm text-muted-foreground">
						{time}
					</div>
				))}
			</div>

			{DAYS.map((day, index) => (
				<div key={day} className="min-w-[200px]">
					<div className="h-12 flex items-center justify-center border-b font-medium">
						{day}
					</div>
					<div className="space-y-2">
						{TIME_SLOTS.map((timeSlot) => {
							const dayPeriods = getPeriodsForTimeSlot(index + 1, timeSlot);
							const breakTime = getBreakForTimeSlot(index + 1, timeSlot);
							return (
								<div key={`${day}-${timeSlot}`} className="h-24 relative border-l group hover:border-l-primary">
									{breakTime && renderBreak(breakTime)}
									{dayPeriods.map(renderPeriod)}
								</div>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}