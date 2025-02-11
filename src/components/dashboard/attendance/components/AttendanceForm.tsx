import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttendanceTrackingMode } from '@/types/attendance';
import { api } from '@/utils/api';
import { useSession } from 'next-auth/react';
import type { Class, ClassGroup, Subject } from '@prisma/client';

interface AttendanceFormProps {
	selectedClass: string;
	selectedDate: Date;
	trackingMode: AttendanceTrackingMode;
	selectedSubject: string | null;
	onClassChange: (classId: string) => void;
	onDateChange: (date: Date) => void;
	onSubjectChange: (subjectId: string) => void;
}

export const AttendanceForm = ({
	selectedClass,
	selectedDate,
	trackingMode,
	selectedSubject,
	onClassChange,
	onDateChange,
	onSubjectChange,
}: AttendanceFormProps) => {
	const { data: session, status: sessionStatus } = useSession();
	const userRoles = session?.user?.roles || [];
	const isAdmin = userRoles.includes('ADMIN');
	const isSuperAdmin = userRoles.includes('SUPER_ADMIN');
	const isTeacher = userRoles.includes('TEACHER');
	const hasAccessPermission = isAdmin || isSuperAdmin || isTeacher;

	const { data: classGroups } = api.classGroup.list.useQuery(
		undefined,
		{
			enabled: sessionStatus === 'authenticated' && hasAccessPermission,
			retry: 1
		}
	);

	const { data: subjects } = api.subject.list.useQuery(
		undefined,
		{ enabled: !!selectedClass && trackingMode !== AttendanceTrackingMode.CLASS }
	);

	const selectedClassGroup = classGroups?.find(group => 
		group.classes?.some(cls => cls.id === selectedClass)
	);

	const filteredSubjects = subjects?.filter(subject => 
		selectedClassGroup?.subjects?.some(s => s.id === subject.id)
	) ?? [];

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
			<div className="space-y-4">
				<div>
					<label className="block text-sm font-medium mb-2">Select Class</label>
					<Select
						value={selectedClass || "no-class-selected"}
						onValueChange={onClassChange}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select a class" />
						</SelectTrigger>
						<SelectContent>
							  {sessionStatus === 'loading' ? (
								<SelectItem value="loading" disabled>Loading...</SelectItem>
							  ) : !session?.user ? (
								<SelectItem value="not-signed-in" disabled>Please sign in</SelectItem>
							  ) : !hasAccessPermission ? (
								<SelectItem value="unauthorized" disabled>Unauthorized access</SelectItem>
							  ) : !classGroups?.length ? (
								<SelectItem value="no-classes" disabled>No classes found</SelectItem>
							  ) : (
								classGroups.flatMap(group => 
								  group.classes?.map(cls => (
									<SelectItem key={cls.id} value={cls.id}>
									  {cls.name}
									</SelectItem>
								  )) ?? []
								)
							  )}
						</SelectContent>
					</Select>
				</div>

				{trackingMode !== AttendanceTrackingMode.CLASS && (
					<div>
						<label className="block text-sm font-medium mb-2">Select Subject</label>
						<Select
							value={selectedSubject || ""}
							onValueChange={onSubjectChange}
							disabled={!selectedClass}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a subject" />
							</SelectTrigger>
							<SelectContent>
								{filteredSubjects.map((subject) => (
									<SelectItem key={subject.id} value={subject.id}>
										{subject.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
			</div>

			<div>
				<label className="block text-sm font-medium mb-2">Date</label>
				<Calendar
					mode="single"
					selected={selectedDate}
					onSelect={(date) => date && onDateChange(date)}
					className="rounded-md border"
				/>
			</div>
		</div>
	);
};