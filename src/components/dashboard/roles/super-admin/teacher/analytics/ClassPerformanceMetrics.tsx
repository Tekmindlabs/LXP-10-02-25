'use client'

import { api } from "@/utils/api";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { RouterOutputs } from "@/utils/api";

interface ClassPerformanceMetricsProps {
	teacherId: string;
}

interface ClassMetric {
	classId: string;
	className: string;
	averageScore: number;
	totalStudents: number;
	completedAssignments: number;
}

type TeacherAnalytics = RouterOutputs["teacher"]["getTeacherAnalytics"];

export function ClassPerformanceMetrics({ teacherId }: ClassPerformanceMetricsProps) {
	const { data: analytics } = api.teacher.getTeacherAnalytics.useQuery({ teacherId });

	return (
		<div className="grid gap-4">
			{analytics?.classes.map((classMetric: ClassMetric) => (
				<Card key={classMetric.classId}>
					<CardContent className="pt-6">
						<div className="flex justify-between mb-2">
							<span className="font-medium">{classMetric.className}</span>
							<span className="text-muted-foreground">{classMetric.averageScore}%</span>
						</div>
						<Progress value={classMetric.averageScore} className="h-2" />
						<div className="mt-2 text-sm text-muted-foreground">
							{classMetric.totalStudents} students • {classMetric.completedAssignments} assignments
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}