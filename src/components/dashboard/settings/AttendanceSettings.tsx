import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AttendanceTrackingMode, type AttendanceSettings as IAttendanceSettings } from "@/types/attendance";
import { Input } from "@/components/ui/input";

const defaultSettings: IAttendanceSettings = {
	trackingMode: AttendanceTrackingMode.CLASS,
	defaultMode: 'CLASS',
	subjectWiseEnabled: false,
	requireNotesForExcused: true,
	allowBulkUpdates: true,
	enableAuditLog: true,
	retentionPeriod: 365,
	notificationSettings: {
		enableAbsenceAlerts: true,
		consecutiveAbsenceThreshold: 3,
		lowAttendanceThreshold: 75
	}
};

export function AttendanceSettings() {
	const { toast } = useToast();
	const utils = api.useUtils();
	
	const [settings, setSettings] = useState<IAttendanceSettings>(defaultSettings);

	const { data: currentSettings } = api.attendance.getSettings.useQuery();
	const { mutate: updateSettings, isPending } = api.attendance.updateAttendanceSettings.useMutation({
		onSuccess: () => {
			toast({
				title: "Settings Updated",
				description: "Attendance settings have been saved successfully.",
			});
			utils.attendance.getSettings.invalidate();
		},
	});

	useEffect(() => {
		if (currentSettings) {
			setSettings({
				...defaultSettings,
				...currentSettings
			});

		}
	}, [currentSettings]);

	const handleSave = () => {
		updateSettings({
			settings: {
				trackingMode: settings.trackingMode,
				defaultMode: settings.defaultMode,
				subjectWiseEnabled: settings.subjectWiseEnabled
			}
		});
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Attendance Tracking Settings</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="space-y-6">
					<div className="space-y-4">
						<div className="flex flex-col gap-2">
							<Label>Tracking Mode</Label>
							<Select
								value={settings.trackingMode}
								onValueChange={(value: AttendanceTrackingMode) => 
									setSettings(prev => ({ ...prev, trackingMode: value }))
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select tracking mode" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={AttendanceTrackingMode.CLASS}>Class-wise only</SelectItem>
									<SelectItem value={AttendanceTrackingMode.SUBJECT}>Subject-wise only</SelectItem>
									<SelectItem value={AttendanceTrackingMode.BOTH}>Both Class and Subject</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{settings.trackingMode === AttendanceTrackingMode.BOTH && (
							<div className="flex flex-col gap-2">
								<Label>Default Mode</Label>
								<Select
									value={settings.defaultMode}
									onValueChange={(value: 'CLASS' | 'SUBJECT') => 
										setSettings(prev => ({ ...prev, defaultMode: value }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select default mode" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="CLASS">Class-wise</SelectItem>
										<SelectItem value="SUBJECT">Subject-wise</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}

						<div className="flex items-center justify-between">
							<Label>Enable Subject-wise Tracking</Label>
							<Switch
								checked={settings.subjectWiseEnabled}
								onCheckedChange={(checked) => 
									setSettings(prev => ({ ...prev, subjectWiseEnabled: checked }))
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<Label>Require Notes for Excused Absences</Label>
							<Switch
								checked={settings.requireNotesForExcused}
								onCheckedChange={(checked) => 
									setSettings(prev => ({ ...prev, requireNotesForExcused: checked }))
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<Label>Allow Bulk Updates</Label>
							<Switch
								checked={settings.allowBulkUpdates}
								onCheckedChange={(checked) => 
									setSettings(prev => ({ ...prev, allowBulkUpdates: checked }))
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<Label>Enable Audit Log</Label>
							<Switch
								checked={settings.enableAuditLog}
								onCheckedChange={(checked) => 
									setSettings(prev => ({ ...prev, enableAuditLog: checked }))
								}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label>Data Retention Period (days)</Label>
							<Input
								type="number"
								value={settings.retentionPeriod}
								onChange={(e) => 
									setSettings(prev => ({ ...prev, retentionPeriod: parseInt(e.target.value) }))
								}
							/>
						</div>
					</div>

					<div className="space-y-4">
						<h3 className="font-semibold">Notification Settings</h3>
						
						<div className="flex items-center justify-between">
							<Label>Enable Absence Alerts</Label>
							<Switch
								checked={settings.notificationSettings.enableAbsenceAlerts}
								onCheckedChange={(checked) => 
									setSettings(prev => ({
										...prev,
										notificationSettings: {
											...prev.notificationSettings,
											enableAbsenceAlerts: checked
										}
									}))
								}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label>Consecutive Absence Threshold</Label>
							<Input
								type="number"
								value={settings.notificationSettings.consecutiveAbsenceThreshold}
								onChange={(e) => 
									setSettings(prev => ({
										...prev,
										notificationSettings: {
											...prev.notificationSettings,
											consecutiveAbsenceThreshold: parseInt(e.target.value)
										}
									}))
								}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label>Low Attendance Threshold (%)</Label>
							<Input
								type="number"
								value={settings.notificationSettings.lowAttendanceThreshold}
								onChange={(e) => 
									setSettings(prev => ({
										...prev,
										notificationSettings: {
											...prev.notificationSettings,
											lowAttendanceThreshold: parseInt(e.target.value)
										}
									}))
								}
							/>
						</div>
					</div>
				</div>

				<Button 
					onClick={handleSave} 
					disabled={isPending}
					className="w-full"
				>
					Save Changes
				</Button>
			</CardContent>
		</Card>
	);
}