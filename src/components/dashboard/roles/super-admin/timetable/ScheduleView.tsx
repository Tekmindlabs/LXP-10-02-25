import { useState, ReactNode } from 'react';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/utils/api";
import { TeacherProfile, Period as PrismaPeriod, Classroom } from "@prisma/client";
import { BreakTime, normalizeBreakTime } from "@/types/timetable";
import { WeeklyScheduleView } from "./WeeklyScheduleView";
import type { PeriodWithRelations } from "./WeeklyScheduleView";
import { formatDisplayTime } from "@/utils/time";



interface ScheduleViewProps {
	type: 'teacher' | 'classroom';
	entityId: string;
	termId: string;
	breakTimes?: BreakTime[];
}




const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
	const hour = Math.floor(i / 2) + 8;
	const minute = i % 2 === 0 ? "00" : "30";
	return `${hour.toString().padStart(2, "0")}:${minute}`;
});

export const ScheduleView = ({ type, entityId, termId, breakTimes = [] }: ScheduleViewProps) => {
	const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
	const [selectedDay, setSelectedDay] = useState(1);

	const { data: scheduleData } = type === 'teacher'
		? api.timetable.getTeacherSchedule.useQuery({ teacherId: entityId, termId })
		: api.timetable.getClassroomSchedule.useQuery({ classroomId: entityId, termId });

	const schedule = scheduleData?.periods;
	const serverBreakTimes = (scheduleData?.breakTimes ?? []).map(breakTime => ({
		startTime: breakTime.startTime,
		endTime: breakTime.endTime,
		type: breakTime.type as "SHORT_BREAK" | "LUNCH_BREAK",
		dayOfWeek: breakTime.dayOfWeek
	}));

	// Merge server and local break times, with local taking precedence
	const allBreakTimes = [...serverBreakTimes, ...breakTimes].reduce<BreakTime[]>((acc, breakTime) => {
		const normalizedBreakTime = normalizeBreakTime(breakTime);
		const exists = acc.some(
			bt => bt.dayOfWeek === normalizedBreakTime.dayOfWeek && 
			bt.startTime === normalizedBreakTime.startTime && 
			bt.endTime === normalizedBreakTime.endTime
		);
		if (!exists) acc.push(normalizedBreakTime);
		return acc;
	}, []);

	const periodsByDay = schedule?.reduce<Record<number, PeriodWithRelations[]>>((acc, period: PeriodWithRelations) => {
		const day = period.dayOfWeek;
		if (!acc[day]) acc[day] = [];
		acc[day].push({
			...period,
			startTime: new Date(period.startTime),
			endTime: new Date(period.endTime),
			subject: { name: period.subject.name },
			teacher: {
				...period.teacher,
				user: {
					name: period.teacher.user?.name ?? null
				}
			},
			classroom: period.classroom,
			timetable: {
				class: {
					name: period.timetable.class.name
				}
			}
		});
		return acc;
	}, {}) ?? {};

	const getPeriodsForTimeSlot = (day: number, timeSlot: string): PeriodWithRelations[] | undefined => {
		return periodsByDay?.[day]?.filter(period => {
			const slotDateTime = new Date(`1970-01-01T${timeSlot}`);
			const startDateTime = new Date(`1970-01-01T${period.startTime.toTimeString().slice(0, 8)}`);
			const endDateTime = new Date(`1970-01-01T${period.endTime.toTimeString().slice(0, 8)}`);
			
			return slotDateTime >= startDateTime && slotDateTime < endDateTime;
		});
	};

	const renderPeriodCard = (period: PeriodWithRelations): ReactNode => (
		<Card key={period.id} className="p-3 bg-primary/5 hover:bg-primary/10 transition-colors border-l-4 border-l-primary">
			<div className="flex justify-between items-start">
				<div>
					<div className="text-sm font-semibold text-primary">
						{period.subject.name}
					</div>
					<div className="text-xs text-muted-foreground mt-1">
						{type === 'teacher' 
							? `Room ${period.classroom.name} - ${period.timetable.class.name}`
							: `${period.teacher.user.name ?? 'Unknown'} - ${period.timetable.class.name}`}
					</div>
				</div>
				<div className="text-xs text-muted-foreground">
					{formatDisplayTime(period.startTime)} - {formatDisplayTime(period.endTime)}
				</div>
			</div>
		</Card>
	);


	const renderBreakTime = (breakTime: BreakTime): ReactNode => (
		<Card 
			key={`break-${breakTime.dayOfWeek}-${breakTime.startTime}`} 
			className="p-3 bg-secondary/10 hover:bg-secondary/20 transition-colors border-l-4 border-l-secondary shadow-sm"
		>
			<div className="flex justify-between items-start">
				<div>
					<div className="text-sm font-semibold text-secondary">
						{breakTime.type === 'LUNCH_BREAK' ? '🍽️ Lunch Break' : '☕ Break'}
					</div>
				</div>
				<div className="text-xs bg-secondary/20 px-2 py-1 rounded-full">
					{formatDisplayTime(breakTime.startTime)} - {formatDisplayTime(breakTime.endTime)}
				</div>
			</div>
		</Card>
	);

	const renderDayView = (): ReactNode => (
		<div className="grid grid-cols-1 gap-2">
			{TIME_SLOTS.map((timeSlot) => {
				const periods = getPeriodsForTimeSlot(selectedDay, timeSlot);
				const breakTime = allBreakTimes.find(breakItem => {
					const slotDateTime = new Date(`1970-01-01T${timeSlot}`);
					const startDateTime = new Date(`1970-01-01T${breakItem.startTime}`);
					const endDateTime = new Date(`1970-01-01T${breakItem.endTime}`);
					
					return breakItem.dayOfWeek === selectedDay &&
						slotDateTime >= startDateTime && slotDateTime < endDateTime;
				});
				return (
					<div key={timeSlot} className="flex group">
						<div className="w-20 py-2 text-sm text-muted-foreground font-medium">
							{timeSlot}
						</div>
						<div className="flex-1 pl-4 min-h-[3rem] border-l group-hover:border-l-primary">
							{breakTime && renderBreakTime(breakTime)}
							{periods?.map(renderPeriodCard)}
						</div>
					</div>
				);
			})}
		</div>
	);

	const renderWeekView = (): ReactNode => {
		const typedSchedule: PeriodWithRelations[] = (schedule ?? []).map(period => ({
			...period,
			startTime: new Date(period.startTime),
			endTime: new Date(period.endTime),
			subject: { name: period.subject.name },
			teacher: {
				...period.teacher,
				user: {
					name: period.teacher.user?.name ?? null
				}
			},
			classroom: period.classroom,
			timetable: {
				class: {
					name: period.timetable.class.name
				}
			}
		}));

		return (
			<WeeklyScheduleView
				periods={typedSchedule}
				breakTimes={allBreakTimes}
				renderPeriod={renderPeriodCard}
				renderBreak={renderBreakTime}
			/>
		);
	};


	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-2xl font-bold">
					{type === 'teacher' ? 'Teacher Schedule' : 'Classroom Schedule'}
				</h2>
				<div className="flex items-center gap-4">
					<Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'day' | 'week')}>
						<TabsList>
							<TabsTrigger value="day">Day View</TabsTrigger>
							<TabsTrigger value="week">Week View</TabsTrigger>
						</TabsList>
					</Tabs>
					{viewMode === 'day' && (
						<Select value={selectedDay.toString()} onValueChange={(value) => setSelectedDay(parseInt(value))}>
							<SelectTrigger className="w-[180px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{DAYS.map((day, index) => (
									<SelectItem key={index + 1} value={(index + 1).toString()}>
										{day}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>
			</div>

			{viewMode === 'day' ? renderDayView() : renderWeekView()}
		</div>
	);
}