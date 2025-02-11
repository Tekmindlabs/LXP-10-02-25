import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AttendanceTrackingMode } from '@/types/attendance';

interface AttendanceSettingsProps {
	trackingMode: AttendanceTrackingMode;
	onTrackingModeChange: (mode: AttendanceTrackingMode) => void;
}

export const AttendanceSettings = ({
	trackingMode,
	onTrackingModeChange,
}: AttendanceSettingsProps) => {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<span>Attendance Tracking Mode</span>
				<Select
					value={trackingMode}
					onValueChange={(value: AttendanceTrackingMode) => onTrackingModeChange(value)}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Select mode" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={AttendanceTrackingMode.CLASS}>Class-wise</SelectItem>
						<SelectItem value={AttendanceTrackingMode.SUBJECT}>Subject-wise</SelectItem>
						<SelectItem value={AttendanceTrackingMode.BOTH}>Both</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="flex items-center justify-between">
				<span>Enable Notifications</span>
				<Switch />
			</div>

			<div className="flex items-center justify-between">
				<span>Auto-mark Late After</span>
				<Select defaultValue="15">
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Select minutes" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="10">10 minutes</SelectItem>
						<SelectItem value="15">15 minutes</SelectItem>
						<SelectItem value="20">20 minutes</SelectItem>
						<SelectItem value="30">30 minutes</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
};