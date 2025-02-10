'use client'

import { api } from "@/utils/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TeachingHoursChartProps {
	teacherId: string;
}

interface WeeklyHours {
	dayName: string;
	totalHours: number;
}

interface ChartData {
	day: string;
	hours: number;
}

export function TeachingHoursChart({ teacherId }: TeachingHoursChartProps) {
	const { data: analytics } = api.teacher.getTeacherAnalytics.useQuery({ teacherId });

	const chartData: ChartData[] = analytics?.weeklyHours.map((day: WeeklyHours) => ({
		day: day.dayName,
		hours: day.totalHours
	})) ?? [];

	return (
		<div className="w-full h-[300px]">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={chartData}>
					<XAxis dataKey="day" />
					<YAxis />
					<Tooltip />
					<Bar dataKey="hours" fill="var(--primary)" />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}