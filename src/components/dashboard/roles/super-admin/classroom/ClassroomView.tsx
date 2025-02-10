"use client";

import { type FC } from "react";
import { api } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ScheduleView } from "@/components/dashboard/roles/super-admin/timetable/ScheduleView";
import { LuUsers, LuBookOpen } from "react-icons/lu";

interface ClassroomViewProps {
	classroomId: string;
}

const ClassroomView: FC<ClassroomViewProps> = ({ classroomId }) => {
	const { data: classroom, isLoading: classroomLoading } = api.classroom.getById.useQuery(classroomId);
	const { data: terms, isLoading: termsLoading, error: termsError } = api.term.getAll.useQuery();




	if (classroomLoading || termsLoading) {

		return <div>Loading...</div>;
	}

	if (!classroom) {
		return <div>Classroom not found</div>;
	}

	const renderResources = () => {
		try {
			const resources = JSON.parse(classroom.resources || "{}");
			return Object.entries(resources).map(([category, items]) => (
				<div key={category} className="space-y-2">
					<h4 className="font-semibold capitalize">{category}</h4>
					<ul className="list-disc list-inside">
						{Array.isArray(items) && items.map((item: string, index: number) => (
							<li key={index}>{item}</li>
						))}
					</ul>
				</div>
			));
		} catch {
			return <p>{classroom.resources}</p>;
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold tracking-tight">{classroom.name}</h2>
				<Button variant="outline">Edit Classroom</Button>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<LuUsers className="h-5 w-5" />
							Capacity
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{classroom.capacity}</p>
						<p className="text-sm text-muted-foreground">Maximum students</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<LuBookOpen className="h-5 w-5" />
							Resources
						</CardTitle>
					</CardHeader>
					<CardContent>
						{renderResources()}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardContent className="pt-6">
					{termsError ? (
						<p className="text-destructive text-center py-4">
							Error loading schedule: {termsError.message}
						</p>
					) : terms?.length ? (
						<ScheduleView
							type="classroom"
							entityId={classroomId}
							termId={terms[0].id}
							breakTimes={[]}
							key={`${classroomId}-${terms[0].id}`}
						/>
					) : (
						<p className="text-muted-foreground text-center py-4">
							No active terms available
						</p>
					)}
				</CardContent>
			</Card>

		</div>

	);
};

export default ClassroomView;