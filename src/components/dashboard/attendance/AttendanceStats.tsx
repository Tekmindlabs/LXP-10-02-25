import { Card, CardContent } from "@/components/ui/card";

interface AttendanceStatsProps {
	todayStats: {
		present: number;
		absent: number;
		total: number;
		bySubject?: Record<string, {
			present: number;
			absent: number;
			total: number;
		}>;
	};
	weeklyPercentage: number;
	mostAbsentStudents: Array<{ name: string; absences: number }>;
	lowAttendanceClasses: Array<{ name: string; percentage: number }>;
	subjectStats?: Array<{
		name: string;
		percentage: number;
		present: number;
		absent: number;
	}>;
}

export const AttendanceStats = ({
	todayStats,
	weeklyPercentage,
	mostAbsentStudents,
	lowAttendanceClasses,
	subjectStats,
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
							<span>Rate:</span>
							<span className="font-medium">{((todayStats.present / todayStats.total) * 100).toFixed(1)}%</span>
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

		{subjectStats && subjectStats.length > 0 && (
			<Card>
				<CardContent className="pt-6">
					<h3 className="font-semibold mb-4">Subject-wise Attendance</h3>
					<div className="space-y-4">
						{subjectStats.map((subject, index) => (
							<div key={index} className="flex justify-between items-center">
								<span className="font-medium">{subject.name}</span>
								<div className="flex gap-4">
									<span className="text-green-600">P: {subject.present}</span>
									<span className="text-red-600">A: {subject.absent}</span>
									<span className="font-medium">{subject.percentage.toFixed(1)}%</span>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		)}
	</div>
  );
};