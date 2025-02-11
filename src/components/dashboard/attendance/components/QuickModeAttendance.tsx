import { Button } from '@/components/ui/button';
import { AttendanceStatus } from '@prisma/client';
import { useSwipeable } from 'react-swipeable';
import type { StudentWithUser, AttendanceRecord } from '../types';

interface QuickModeAttendanceProps {
	students: StudentWithUser[];
	attendanceData: Map<string, AttendanceRecord>;
	onAttendanceChange: (studentId: string, status: AttendanceStatus, notes?: string) => void;
}

export const QuickModeAttendance = ({
	students,
	attendanceData,
	onAttendanceChange,
}: QuickModeAttendanceProps) => {
	const handlers = useSwipeable({
		onSwipedLeft: (eventData) => {
			const element = eventData.event.target as HTMLElement;
			const studentId = element.getAttribute('data-student-id');
			if (studentId) onAttendanceChange(studentId, AttendanceStatus.ABSENT);
		},
		onSwipedRight: (eventData) => {
			const element = eventData.event.target as HTMLElement;
			const studentId = element.getAttribute('data-student-id');
			if (studentId) onAttendanceChange(studentId, AttendanceStatus.PRESENT);
		}
	});

	return (
		<div className="space-y-2">
			{students?.map((student) => (
				<div
					key={student.id}
					{...handlers}
					data-student-id={student.id}
					className={`p-4 rounded-lg shadow transition-colors ${
						attendanceData.get(student.id)?.status === AttendanceStatus.PRESENT
							? 'bg-green-50'
							: attendanceData.get(student.id)?.status === AttendanceStatus.ABSENT
							? 'bg-red-50'
							: 'bg-white'
					}`}
				>
					<div className="flex justify-between items-center">
						<span>{student.user.name || 'Unnamed Student'}</span>
						<div className="flex gap-2">
							<Button
								size="sm"
								variant="ghost"
								onClick={() => onAttendanceChange(student.id, AttendanceStatus.PRESENT)}
							>
								Present
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => onAttendanceChange(student.id, AttendanceStatus.ABSENT)}
							>
								Absent
							</Button>
						</div>
					</div>
				</div>
			))}
		</div>
	);
};