import { Card, CardContent } from "@/components/ui/card";

interface AttendanceDashboardProps {
	attendanceTrend?: {
		date: string;
		percentage: number;
	}[];
	classAttendance?: {
		className: string;
		present: number;
		absent: number;
		percentage: number;
		subjectAttendance?: Array<{
			subjectName: string;
			present: number;
			absent: number;
			percentage: number;
		}>;
	}[];
}

export function AttendanceDashboard({
	attendanceTrend = [],
	classAttendance = []
}: AttendanceDashboardProps) {
	const totalStudents = classAttendance.reduce((acc, curr) => acc + curr.present + curr.absent, 0);
	const averageAttendance = classAttendance.reduce((acc, curr) => acc + curr.percentage, 0) / (classAttendance.length || 1);

	// Calculate subject-wise statistics
	const subjectStats = classAttendance.reduce((acc, cls) => {
		cls.subjectAttendance?.forEach(subject => {
			if (!acc[subject.subjectName]) {
				acc[subject.subjectName] = {
					present: 0,
					absent: 0,
					total: 0
				};
			}
			acc[subject.subjectName].present += subject.present;
			acc[subject.subjectName].absent += subject.absent;
			acc[subject.subjectName].total += subject.present + subject.absent;
		});
		return acc;
	}, {} as Record<string, { present: number; absent: number; total: number; }>);

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

			{Object.keys(subjectStats).length > 0 && (
				<Card>
					<CardContent className="p-6">
						<h3 className="text-lg font-semibold mb-4">Subject-wise Overview</h3>
						<div className="space-y-4">
							{Object.entries(subjectStats).map(([subject, stats]) => (
								<div key={subject} className="flex justify-between items-center">
									<span className="font-medium">{subject}</span>
									<div className="flex gap-4">
										<span className="text-green-600">Present: {stats.present}</span>
										<span className="text-red-600">Absent: {stats.absent}</span>
										<span className="font-medium">
											{((stats.present / stats.total) * 100).toFixed(1)}%
										</span>
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
