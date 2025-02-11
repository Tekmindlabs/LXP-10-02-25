import { AttendanceSettings } from "@/components/dashboard/settings/AttendanceSettings";
import { DashboardShell } from "@/components/dashboard/layouts/dashboard-shell";
import { DashboardHeader } from "@/components/dashboard/layouts/dashboard-header";

export default function AttendanceSettingsPage() {
	return (
		<DashboardShell>
			<DashboardHeader
				heading="Attendance Settings"
				text="Configure how attendance is tracked across your institution."
			/>
			<div className="grid gap-8">
				<AttendanceSettings />
			</div>
		</DashboardShell>
	);
}