import { AttendanceStatus } from '@prisma/client';
import { Card, CardContent } from "@/components/ui/card";

interface AttendanceDashboardProps {
	attendanceTrend?: Array<{
		date: string;
		percentage: number;
		breakdown: Record<AttendanceStatus, number>;
	}>;
	classAttendance?: Array<{
		className: string;
		present: number;
		absent: number;
		late: number;
		excused: number;
		percentage: number;
	}>;
}

export function AttendanceDashboard({
	attendanceTrend = [],
	classAttendance = []
}: AttendanceDashboardProps) {
	const totalStudents = classAttendance.reduce((acc, curr) => 
		acc + curr.present + curr.absent + curr.late + curr.excused, 0);
	const averageAttendance = classAttendance.reduce((acc, curr) => acc + curr.percentage, 0) / 
		(classAttendance.length || 1);

	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardContent className="p-6">
						<div className="text-2xl font-bold">{totalStudents}</div>
						<p className="text-xs text-muted-foreground">Total Students</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-6">
						<div className="text-2xl font-bold">{averageAttendance.toFixed(1)}%</div>
						<p className="text-xs text-muted-foreground">Average Attendance</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-6">
						<div className="text-2xl font-bold">{classAttendance.length}</div>
						<p className="text-xs text-muted-foreground">Active Classes</p>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-6">
						<div className="text-2xl font-bold">{attendanceTrend.length}</div>
						<p className="text-xs text-muted-foreground">Days Recorded</p>
					</CardContent>
				</Card>
			</div>

			{attendanceTrend.length > 0 && (
				<Card>
					<CardContent className="p-6">
						<h3 className="text-lg font-semibold mb-4">Attendance Breakdown</h3>
						<div className="space-y-4">
							{attendanceTrend.map((day) => (
								<div key={day.date} className="flex justify-between items-center">
									<span className="font-medium">{day.date}</span>
									<div className="flex gap-4">
										<span className="text-green-600">P: {day.breakdown.PRESENT}</span>
										<span className="text-red-600">A: {day.breakdown.ABSENT}</span>
										<span className="text-yellow-600">L: {day.breakdown.LATE}</span>
										<span className="text-blue-600">E: {day.breakdown.EXCUSED}</span>
										<span className="font-medium">{day.percentage.toFixed(1)}%</span>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

