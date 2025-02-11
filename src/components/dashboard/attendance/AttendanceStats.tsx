import { Card, CardContent } from "@/components/ui/card";

interface AttendanceStatsProps {
	todayStats: {
		present: number;
		absent: number;
		late: number;
		excused: number;
		total: number;
		percentage: number;
	};
	weeklyPercentage: number;
	mostAbsentStudents: Array<{
		name: string;
		absences: number;
		consecutiveAbsences?: number;
		lastAttendance?: Date;
	}>;
	lowAttendanceClasses: Array<{
		name: string;
		percentage: number;
		trend?: Array<{
			date: string;
			percentage: number;
		}>;
	}>;
}

export const AttendanceStats = ({
	todayStats,
	weeklyPercentage,
	mostAbsentStudents,
	lowAttendanceClasses,
}: AttendanceStatsProps) => {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardContent className="pt-6">
						<h3 className="font-semibold mb-2">Today's Overview</h3>
						<div className="space-y-2">
							<div className="flex justify-between">
								<span>Present:</span>
								<span className="font-medium text-green-600">{todayStats.present}</span>
							</div>
							<div className="flex justify-between">
								<span>Absent:</span>
								<span className="font-medium text-red-600">{todayStats.absent}</span>
							</div>
							<div className="flex justify-between">
								<span>Late:</span>
								<span className="font-medium text-yellow-600">{todayStats.late}</span>
							</div>
							<div className="flex justify-between">
								<span>Excused:</span>
								<span className="font-medium text-blue-600">{todayStats.excused}</span>
							</div>
							<div className="flex justify-between">
								<span>Rate:</span>
								<span className="font-medium">{todayStats.percentage.toFixed(1)}%</span>
							</div>
						</div>
					</CardContent>
				</Card>

			<Card>
				<CardContent className="pt-6">
					<h3 className="font-semibold mb-2">Weekly Attendance</h3>
					<div className="text-3xl font-bold text-center text-primary">
						{weeklyPercentage.toFixed(1)}%
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="pt-6">
					<h3 className="font-semibold mb-2">Most Absent Students</h3>
					<ul className="space-y-2">
						{mostAbsentStudents.slice(0, 3).map((student, index) => (
							<li key={index} className="flex justify-between">
								<span className="truncate">{student.name}</span>
								<span className="font-medium text-red-600">{student.absences}</span>
							</li>
						))}
					</ul>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="pt-6">
					<h3 className="font-semibold mb-2">Low Attendance Classes</h3>
					<ul className="space-y-2">
						{lowAttendanceClasses.slice(0, 3).map((cls, index) => (
							<li key={index} className="flex justify-between">
								<span className="truncate">{cls.name}</span>
								<span className="font-medium text-yellow-600">{cls.percentage}%</span>
							</li>
						))}
					</ul>
				</CardContent>
			</Card>
		</div>



	</div>
  );
};