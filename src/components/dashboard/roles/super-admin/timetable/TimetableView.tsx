'use client'

import { useState, ReactNode } from 'react';
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { api } from "@/utils/api";
import { TeacherProfile, Period as PrismaPeriod, Classroom } from "@prisma/client";
import { PeriodDialog } from "./PeriodDialog";
import { PeriodInput, BreakTime, normalizeBreakTime, formatTimeString, parseTimeString } from "@/types/timetable";


type PeriodWithRelations = PrismaPeriod & {
	subject: { name: string; id: string };
	teacher: TeacherProfile & { 
		user: { 
			id: string;
			name: string | null;
		} 
	};
	classroom: Classroom;
	timetable: {
		class: {
			name: string;
		};
	};
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
	const hour = Math.floor(i / 2) + 8;
	const minute = i % 2 === 0 ? "00" : "30";
	return `${hour.toString().padStart(2, "0")}:${minute}`;
});

export default function TimetableView({ timetableId }: { timetableId: string }) {
	const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
	const [selectedDay, setSelectedDay] = useState(1);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [selectedPeriod, setSelectedPeriod] = useState<Partial<PeriodInput> | undefined>(undefined);

	const { data: timetable, isLoading, refetch } = api.timetable.getById.useQuery(
		timetableId, 
		{
			refetchOnWindowFocus: true,
			refetchOnMount: true,
			refetchInterval: 1000 // Refetch every second while component is mounted
		}
	);

	const utils = api.useUtils();

	if (isLoading) return <div>Loading...</div>;
	if (!timetable) return <div>Timetable not found</div>;

	const periodsByDay = timetable.periods.reduce<Record<number, PeriodWithRelations[]>>((acc, period) => {
		const day = period.dayOfWeek;
		if (!acc[day]) acc[day] = [];
		
		// Ensure dates are properly handled with type assertions
		const periodWithDates: PeriodWithRelations = {
			...period,
			startTime: new Date(period.startTime),
			endTime: new Date(period.endTime),
			subject: period.subject,
			teacher: period.teacher,
			classroom: period.classroom,
			timetable: period.timetable
		};
		
		acc[day].push(periodWithDates);
		return acc;
	}, {});

	const breakTimesByDay = timetable.breakTimes?.reduce<Record<number, BreakTime[]>>((acc, breakTime) => {
		const day = breakTime.dayOfWeek;
		if (!acc[day]) acc[day] = [];
		acc[day].push(normalizeBreakTime(breakTime));
		return acc;
	}, {}) ?? {};

	const renderBreakTimeCard = (breakTime: BreakTime): ReactNode => {
		const startDateTime = new Date(`1970-01-01T${breakTime.startTime}`);
		const endDateTime = new Date(`1970-01-01T${breakTime.endTime}`);
		const durationInMinutes = (endDateTime.getTime() - startDateTime.getTime()) / 60000;
		
		return (
			<Card 
				key={`break-${breakTime.dayOfWeek}-${breakTime.startTime}-${breakTime.endTime}`} 
				className={cn(
					"p-3 transition-colors border-l-4 border-l-secondary",
					breakTime.type === 'LUNCH_BREAK' 
						? "bg-[var(--break-lunch)] hover:bg-[var(--secondary-hover)]" 
						: "bg-[var(--break-short)] hover:bg-[var(--secondary-hover)]"
				)}
				style={{ 
					minHeight: `${(durationInMinutes / 30) * 3}rem`
				}}
			>
				<div className="flex justify-between items-start">
					<div>
						<div className="text-sm font-semibold text-secondary">
							{breakTime.type === 'SHORT_BREAK' ? '☕ Short Break' : '🍽️ Lunch Break'}
						</div>
						<div className="text-xs text-muted-foreground mt-1">
							{Math.round(durationInMinutes)} minutes
						</div>
					</div>
					<div className="text-xs text-muted-foreground">
						{formatTimeString(parseTimeString(breakTime.startTime))} - {formatTimeString(parseTimeString(breakTime.endTime))}
					</div>
				</div>
			</Card>
		);
	};


	const getPeriodsForTimeSlot = (day: number, timeSlot: string): { 
		periods: PeriodWithRelations[] | undefined; 
		breakTimes: BreakTime[] | undefined; 
	} => {
		// Handle periods
		const periods = periodsByDay?.[day]?.filter(period => {
			const slotDateTime = new Date(`1970-01-01T${timeSlot}`);
			const startDateTime = new Date(`1970-01-01T${period.startTime.toTimeString().slice(0, 8)}`);
			
			// A period must start at the exact time slot
			return slotDateTime.getTime() === startDateTime.getTime();
		});

		// Handle break times separately
		const breakTimes = breakTimesByDay?.[day]?.filter(breakTime => {
			const slotDateTime = new Date(`1970-01-01T${timeSlot}`);
			const startDateTime = new Date(`1970-01-01T${breakTime.startTime}`);
			const endDateTime = new Date(`1970-01-01T${breakTime.endTime}`);
			
			// A break can overlap with the time slot
			return slotDateTime >= startDateTime && slotDateTime < endDateTime;
		});

		return { periods, breakTimes };
	};


	const handlePeriodSave = async (periodData: PeriodInput) => {
		try {
			console.log('Period saved:', periodData); // Debug log
			
			// Invalidate all related queries
			await Promise.all([
				utils.timetable.getById.invalidate(timetableId),
				utils.timetable.getAll.invalidate(),
				utils.timetable.getTeacherSchedule.invalidate(),
				utils.timetable.getClassroomSchedule.invalidate()
			]);
			
			// Force an immediate refetch
			const updatedTimetable = await refetch();
			console.log('Updated timetable:', updatedTimetable.data); // Debug log
			
			setIsDialogOpen(false);
			setSelectedPeriod(undefined);
		} catch (error) {
			console.error('Error refreshing timetable data:', error);
		}
	};

	const handleAddPeriod = () => {
		setSelectedPeriod(undefined);
		setIsDialogOpen(true);
	};

	const handleEditPeriod = (period: PeriodWithRelations) => {
		setSelectedPeriod({
			id: period.id,
			startTime: period.startTime,
			endTime: period.endTime,
			daysOfWeek: [period.dayOfWeek],
			durationInMinutes: period.durationInMinutes,
			teacherId: period.teacher.user.id,
			classroomId: period.classroomId,
			subjectId: period.subjectId,
			timetableId: period.timetableId
		});
		setIsDialogOpen(true);
	};

	const renderPeriodCard = (period: PeriodWithRelations): ReactNode => (
		<Card 
			key={period.id} 
			className="p-3 bg-primary/5 hover:bg-primary/10 transition-colors border-l-4 border-l-primary cursor-pointer"
			onClick={() => handleEditPeriod(period)}
			style={{ 
				minHeight: `${(period.durationInMinutes / 30) * 3}rem` 
			}}
		>
			<div className="flex justify-between items-start">
				<div>
					<div className="text-sm font-semibold text-primary">
						{period.subject.name}
					</div>
					<div className="text-xs text-muted-foreground mt-1">
						{period.teacher.user.name ?? 'Unknown'} - Room {period.classroom.name}
					</div>
				</div>
				<div className="text-xs text-muted-foreground">
					{formatTimeString(period.startTime)} - {formatTimeString(period.endTime)}
				</div>
			</div>
		</Card>
	);


	const renderDayView = (): ReactNode => (
		<div className="grid grid-cols-1 gap-2">
			{TIME_SLOTS.map((timeSlot) => {
				const { periods, breakTimes } = getPeriodsForTimeSlot(selectedDay, timeSlot);
				return (
					<div key={timeSlot} className="flex group">
						<div className="w-20 py-2 text-sm text-muted-foreground font-medium">
							{timeSlot}
						</div>
						<div className="flex-1 pl-4 min-h-[3rem] border-l group-hover:border-l-primary">
							{periods?.map(renderPeriodCard)}
							{breakTimes?.map(renderBreakTimeCard)}
						</div>
					</div>
				);
			})}
		</div>
	);

	const renderWeekView = (): ReactNode => (
		<div className="grid grid-cols-6 gap-4">
			<div className="col-span-1">
				<div className="h-10" /> {/* Header spacer */}
				{TIME_SLOTS.map(slot => (
					<div key={slot} className="h-24 text-sm text-muted-foreground p-2">
						{slot}
					</div>
				))}
			</div>
			{DAYS.map((day, index) => (
				<div key={day} className="col-span-1">
					<div className="h-10 font-semibold text-center">{day}</div>
					{TIME_SLOTS.map(slot => {
						const { periods, breakTimes } = getPeriodsForTimeSlot(index + 1, slot);
						return (
							<div key={slot} className="h-24 border-l p-2">
								{periods?.map(renderPeriodCard)}
								{breakTimes?.map(renderBreakTimeCard)}
							</div>
						);
					})}
				</div>
			))}
		</div>
	);

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-2xl font-bold">
					{timetable.class?.name || timetable.classGroup?.name} Timetable
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
					<Button onClick={handleAddPeriod}>
						Add Period
					</Button>
				</div>
			</div>

			{viewMode === 'day' ? renderDayView() : renderWeekView()}

			<PeriodDialog
				isOpen={isDialogOpen}
				onClose={() => setIsDialogOpen(false)}
				onSave={handlePeriodSave}
				period={selectedPeriod}
				timetableId={timetableId}
				breakTimes={timetable.breakTimes ?? []}
			/>

		</div>
	);
}