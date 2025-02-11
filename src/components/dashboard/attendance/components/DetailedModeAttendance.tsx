import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttendanceStatus } from '@prisma/client';
import type { StudentWithUser, AttendanceRecord } from '../types';

interface DetailedModeAttendanceProps {
	students: StudentWithUser[];
	attendanceData: Map<string, AttendanceRecord>;
	onAttendanceChange: (studentId: string, status: AttendanceStatus, notes?: string) => void;
}

export const DetailedModeAttendance = ({
	students,
	attendanceData,
	onAttendanceChange,
}: DetailedModeAttendanceProps) => {
	return (
		<table className="w-full">
			<thead>
				<tr>
					<th className="text-left p-2">Student</th>
					<th className="text-left p-2">Status</th>
					<th className="text-left p-2">Notes</th>
				</tr>
			</thead>
			<tbody>
				{students?.map((student) => (
					<tr key={student.id}>
						<td className="p-2">{student.user.name}</td>
						<td className="p-2">
							<Select
								value={attendanceData.get(student.id)?.status || AttendanceStatus.PRESENT}
								onValueChange={(value) => onAttendanceChange(student.id, value as AttendanceStatus, attendanceData.get(student.id)?.notes)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select status" />
								</SelectTrigger>
								<SelectContent>
									{Object.values(AttendanceStatus)
										.filter(status => !!status)
										.map(status => (
											<SelectItem key={status} value={status}>
												{status.replace(/_/g, ' ')}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</td>
						<td className="p-2">
							<input
								type="text"
								className="w-full p-2 border rounded"
								placeholder="Add notes..."
								value={attendanceData.get(student.id)?.notes || ''}
								onChange={(e) => onAttendanceChange(
									student.id,
									attendanceData.get(student.id)?.status || AttendanceStatus.PRESENT,
									e.target.value
								)}
							/>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
};