'use client'

import { useState } from "react";
import { api } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { PeriodDialog } from "../timetable/PeriodDialog";
import { ScheduleView } from "../timetable/ScheduleView";
import { TeacherAnalyticsSection } from "./analytics/TeacherAnalyticsSection";
import type { Period, ClassActivity } from "@prisma/client";
import type { RouterOutputs } from "@/utils/api";

const TabSections = {
	PROFILE: 'profile',
	SCHEDULE: 'schedule',
	ASSIGNMENTS: 'assignments',
	ANALYTICS: 'analytics'
} as const;

type TabSection = typeof TabSections[keyof typeof TabSections];

type ExtendedPeriod = Period & {
	subject: { name: string };
	classroom: { name: string };
	timetable: { id: string };
};

type ViewMode = 'daily' | 'weekly' | 'monthly';

interface TeacherProfileViewProps {
	teacherId: string;
}

export default function TeacherProfileView({ teacherId }: TeacherProfileViewProps) {
	const [activeTab, setActiveTab] = useState<TabSection>(TabSections.PROFILE);
	const [calendarView, setCalendarView] = useState<ViewMode>('monthly');
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [selectedPeriod, setSelectedPeriod] = useState<ExtendedPeriod | null>(null);

	const { data: teacher, isLoading } = api.teacher.getById.useQuery(teacherId, {
		select: (data) => ({
			...data,
			teacherProfile: {
				...data.teacherProfile,
				classes: data.teacherProfile?.classes.map(c => ({
					...c,
					class: {
						...c.class,
						term: c.class.term
					}
				})) ?? []
			}
		})
	});
	const utils = api.useContext();

	if (isLoading) return <div>Loading...</div>;
	if (!teacher?.teacherProfile) return <div>Teacher not found</div>;

	const timetableId = teacher.teacherProfile.classes[0]?.class.timetable?.id;
	const assignments = teacher.teacherProfile.classes.flatMap(teacherClass => 
		teacherClass.class.activities?.map(activity => ({
			...activity,
			className: teacherClass.class.name,
			classGroupName: teacherClass.class.classGroup.name
		})) || []
	);


	const handlePeriodClick = (period: ExtendedPeriod) => {
		setSelectedPeriod(period);
		setIsDialogOpen(true);
	};

	const handleAddPeriod = () => {
		setSelectedPeriod(null);
		setIsDialogOpen(true);
	};

	const handleDialogClose = () => {
		setIsDialogOpen(false);
		setSelectedPeriod(null);
	};

	const handlePeriodSave = () => {
		utils.teacher.getById.invalidate(teacherId);
	};




	return (
		<div className="space-y-6">
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList>
					<TabsTrigger value={TabSections.PROFILE}>Profile</TabsTrigger>
					<TabsTrigger value={TabSections.SCHEDULE}>Schedule</TabsTrigger>
					<TabsTrigger value={TabSections.ASSIGNMENTS}>Assignments</TabsTrigger>
					<TabsTrigger value={TabSections.ANALYTICS}>Analytics</TabsTrigger>
				</TabsList>

				<TabsContent value={TabSections.PROFILE}>
					<Card>
						<CardHeader>
							<CardTitle>Teacher Profile</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4">
								<div>
									<h3 className="font-semibold">Name</h3>
									<p>{teacher.name}</p>
								</div>
								<div>
									<h3 className="font-semibold">Email</h3>
									<p>{teacher.email}</p>
								</div>
								<div>
									<h3 className="font-semibold">Specialization</h3>
									<p>{teacher.teacherProfile.specialization || 'Not specified'}</p>
								</div>
								<div>
									<h3 className="font-semibold">Assigned Classes</h3>
									<div className="space-y-2">
										{teacher.teacherProfile.classes.map(teacherClass => (
											<div key={teacherClass.class.id} className="flex justify-between">
												<span>{teacherClass.class.name}</span>
												<span className="text-muted-foreground">
													{teacherClass.class.classGroup.name}
												</span>
											</div>
										))}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value={TabSections.SCHEDULE}>
					<div className="grid md:grid-cols-[1fr_300px] gap-6">
						<Card>
							<CardContent className="p-6">
								{teacher.teacherProfile.classes[0]?.class.term && (
									<ScheduleView 
										type="teacher"
										entityId={teacherId}
										termId={teacher.teacherProfile.classes[0].class.term.id}
									/>
								)}
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-4">
								<Calendar
									mode="single"
									selected={selectedDate}
									onSelect={(date) => date && setSelectedDate(date)}
								/>
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value={TabSections.ASSIGNMENTS}>
					<Card>
						<CardHeader>
							<CardTitle>Upcoming Assignments</CardTitle>
						</CardHeader>
						<CardContent>
							{assignments.length > 0 ? (
								assignments.map(assignment => (
									<Card key={assignment.id} className="mb-4">
										<CardContent className="p-4">
											<div>
												<h4 className="font-semibold">{assignment.title}</h4>
												<div className="flex justify-between items-center mt-2">
													<p className="text-sm text-muted-foreground">
														Deadline: {format(new Date(assignment.deadline!), 'PPP')}
													</p>
													<span className="text-sm">
														{assignment.className} - {assignment.classGroupName}
													</span>
												</div>
												{assignment.description && (
													<p className="mt-2 text-sm">{assignment.description}</p>
												)}
											</div>
										</CardContent>
									</Card>
								))
							) : (
								<p className="text-muted-foreground text-center">No upcoming assignments</p>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			<TabsContent value={TabSections.ANALYTICS}>
				<TeacherAnalyticsSection teacherId={teacherId} />
			</TabsContent>
		</Tabs>

			{isDialogOpen && timetableId && (
				<PeriodDialog
					isOpen={isDialogOpen}
					onClose={handleDialogClose}
					selectedDate={selectedDate}
					timetableId={timetableId}
					period={selectedPeriod}
					onSave={handlePeriodSave}
				/>
			)}
		</div>
	);

}
