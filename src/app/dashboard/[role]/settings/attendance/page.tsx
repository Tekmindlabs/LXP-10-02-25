import { AttendanceSettings } from "@/components/dashboard/settings/AttendanceSettings";

export default function AttendanceSettingsPage() {
	return (
		<div className="container mx-auto p-6">
			<div className="mb-6">
				<h1 className="text-2xl font-bold">Attendance Settings</h1>
				<p className="text-muted-foreground">Configure how attendance is tracked across your institution.</p>
			</div>
			<AttendanceSettings />
		</div>
	);
}
