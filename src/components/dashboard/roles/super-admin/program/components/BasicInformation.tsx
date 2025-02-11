import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Status } from "@prisma/client";
import { ProgramFormData } from "@/types/program";

interface BasicInformationProps {
	formData: ProgramFormData;
	calendars: any[];
	coordinators: any[];
	onFormDataChange: (newData: Partial<ProgramFormData>) => void;
}

export const BasicInformation = ({ formData, calendars, coordinators, onFormDataChange }: BasicInformationProps) => {
	return (
		<div className="space-y-4">
			<div>
				<Label htmlFor="name">Name</Label>
				<Input
					id="name"
					value={formData.name}
					onChange={(e) => onFormDataChange({ name: e.target.value })}
					required
				/>
			</div>

			<div>
				<Label htmlFor="description">Description</Label>
				<Textarea
					id="description"
					value={formData.description}
					onChange={(e) => onFormDataChange({ description: e.target.value })}
				/>
			</div>

			<div>
				<Label htmlFor="calendar">Calendar</Label>
				<Select
					value={formData.calendarId}
					onValueChange={(value) => onFormDataChange({ calendarId: value })}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select Calendar" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="NO_SELECTION">Select Calendar</SelectItem>
						{calendars?.map((calendar) => (
							<SelectItem key={calendar.id} value={calendar.id}>
								{calendar.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div>
				<Label htmlFor="coordinator">Coordinator</Label>
				<Select
					value={formData.coordinatorId}
					onValueChange={(value) => onFormDataChange({ coordinatorId: value })}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select Coordinator" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="NO_SELECTION">Select Coordinator</SelectItem>
						{coordinators.map((coordinator) => (
							<SelectItem key={coordinator.id} value={coordinator.id}>
								{coordinator.user.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div>
				<Label htmlFor="status">Status</Label>
				<Select
					value={formData.status}
					onValueChange={(value) => onFormDataChange({ status: value as Status })}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select Status" />
					</SelectTrigger>
					<SelectContent>
						{Object.values(Status).map((status) => (
							<SelectItem key={status} value={status}>
								{status}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
};