'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeachingHoursChart } from "./TeachingHoursChart";
import { SubjectDistributionChart } from "./SubjectDistributionChart";
import { ClassPerformanceMetrics } from "./ClassPerformanceMetrics";

interface TeacherAnalyticsSectionProps {
	teacherId: string;
}

export function TeacherAnalyticsSection({ teacherId }: TeacherAnalyticsSectionProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
			<Card>
				<CardHeader>
					<CardTitle>Teaching Hours</CardTitle>
				</CardHeader>
				<CardContent>
					<TeachingHoursChart teacherId={teacherId} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Subject Distribution</CardTitle>
				</CardHeader>
				<CardContent>
					<SubjectDistributionChart teacherId={teacherId} />
				</CardContent>
			</Card>

			<Card className="md:col-span-2">
				<CardHeader>
					<CardTitle>Class Performance</CardTitle>
				</CardHeader>
				<CardContent>
					<ClassPerformanceMetrics teacherId={teacherId} />
				</CardContent>
			</Card>
		</div>
	);
}