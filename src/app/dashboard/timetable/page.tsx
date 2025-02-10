"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimetableForm } from "@/components/dashboard/timetable/TimetableForm";
import { ScheduleView } from "@/components/dashboard/roles/super-admin/timetable/ScheduleView";
import { api } from "@/utils/api";
import { TeacherProfile, Term, Classroom, User } from "@prisma/client";

type TeacherWithUser = TeacherProfile & {
	user: User;
};

export default function TimetablePage() {
	const [selectedTeacher, setSelectedTeacher] = useState<string>("");
	const [selectedClassroom, setSelectedClassroom] = useState<string>("");
	const [selectedTerm, setSelectedTerm] = useState<string>("");

	const { data: teachers } = api.teacher.searchTeachers.useQuery({ search: "" });
	const { data: classrooms } = api.classroom.list.useQuery();
	const { data: terms } = api.term.getAll.useQuery();

	return (
		<div className="container mx-auto py-6">
			<h1 className="text-3xl font-bold mb-6">Timetable Management</h1>

			<Tabs defaultValue="create" className="space-y-4">
				<TabsList>
					<TabsTrigger value="create">Create Timetable</TabsTrigger>
					<TabsTrigger value="teacher">Teacher Schedule</TabsTrigger>
					<TabsTrigger value="classroom">Classroom Schedule</TabsTrigger>
				</TabsList>

				<TabsContent value="create">
					<div className="p-4 bg-card rounded-lg">
						<TimetableForm />
					</div>
				</TabsContent>

				<TabsContent value="teacher">
					<div className="space-y-4">
						<div className="flex gap-4">
							<select
								value={selectedTeacher}
								onChange={(e) => setSelectedTeacher(e.target.value)}
								className="border rounded p-2"
							>
								<option value="">Select Teacher</option>
								{teachers?.map((teacher) => (
									<option key={teacher.id} value={teacher.id}>
										{teacher.name ?? 'Unknown'}
									</option>
								))}
							</select>

							<select
								value={selectedTerm}
								onChange={(e) => setSelectedTerm(e.target.value)}
								className="border rounded p-2"
							>
								<option value="">Select Term</option>
								{terms?.map((term) => (
									<option key={term.id} value={term.id}>
										{term.name}
									</option>
								))}
							</select>
						</div>

						{selectedTeacher && selectedTerm && (
							<ScheduleView
								type="teacher"
								entityId={selectedTeacher}
								termId={selectedTerm}
							/>
						)}
					</div>
				</TabsContent>

				<TabsContent value="classroom">
					<div className="space-y-4">
						<div className="flex gap-4">
							<select
								value={selectedClassroom}
								onChange={(e) => setSelectedClassroom(e.target.value)}
								className="border rounded p-2"
							>
								<option value="">Select Classroom</option>
								{classrooms?.map((classroom) => (
									<option key={classroom.id} value={classroom.id}>
										{classroom.name}
									</option>
								))}
							</select>

							<select
								value={selectedTerm}
								onChange={(e) => setSelectedTerm(e.target.value)}
								className="border rounded p-2"
							>
								<option value="">Select Term</option>
								{terms?.map((term) => (
									<option key={term.id} value={term.id}>
										{term.name}
									</option>
								))}
							</select>
						</div>

						{selectedClassroom && selectedTerm && (
							<ScheduleView
								type="classroom"
								entityId={selectedClassroom}
								termId={selectedTerm}
							/>
						)}
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}