import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/utils/api";
import { PeriodInput, periodInputSchema } from "@/types/timetable";
import { toast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

interface PeriodDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (period: PeriodInput) => void;
	breakTimes: { startTime: string; endTime: string; dayOfWeek: number }[];
	period?: Partial<PeriodInput>;
	timetableId: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function PeriodDialog({ isOpen, onClose, onSave, breakTimes, period, timetableId }: PeriodDialogProps) {
	const form = useForm<PeriodInput>({
		resolver: zodResolver(periodInputSchema),
		defaultValues: {
			startTime: period?.startTime ? new Date(period.startTime) : new Date(),
			endTime: period?.endTime ? new Date(period.endTime) : new Date(),
			daysOfWeek: period?.daysOfWeek ?? [1],
			durationInMinutes: period?.durationInMinutes ?? 45,
			teacherId: period?.teacherId ?? "",
			classroomId: period?.classroomId ?? "",
			subjectId: period?.subjectId ?? "",
			timetableId: timetableId
		},
		mode: "onChange"
	});

	const { data: teachers } = api.teacher.searchTeachers.useQuery({ search: "" });
	const { data: classrooms } = api.classroom.list.useQuery();
	const { data: subjects } = api.subject.list.useQuery();
	const { mutateAsync: checkAvailability } = api.timetable.checkAvailability.useMutation();
	const { mutate: createPeriod } = api.timetable.createPeriod.useMutation();
	const { mutate: updatePeriod } = api.timetable.updatePeriod.useMutation();

	const onSubmit = async (data: PeriodInput) => {
		try {
			if (!data.startTime || !data.endTime) {
				toast({
					title: "Validation Error",
					description: "Start time and end time are required",
					variant: "destructive"
				});
				return;
			}

			const startTime = data.startTime;
			const endTime = data.endTime;

			if (startTime >= endTime) {
				toast({
					title: "Validation Error",
					description: "End time must be after start time",
					variant: "destructive"
				});
				return;
			}
			const durationInMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
			
			const periodData = {
				...data,
				durationInMinutes,
				startTime,
				endTime,
				timetableId
			};

			const availability = await checkAvailability({
				period: periodData,
				breakTimes,
				excludePeriodId: period?.id
			});

			if (!availability.isAvailable) {
				const conflictMessages = availability.conflicts.map(conflict => {
					const { startTime, endTime } = conflict.details;
					switch (conflict.type) {
						case 'TEACHER':
							return `Teacher is not available at ${startTime} - ${endTime}`;
						case 'CLASSROOM':
							return `Classroom is booked for ${startTime} - ${endTime}`;
						case 'BREAK_TIME':
							return `Period overlaps with break time: ${startTime} - ${endTime}`;
						default:
							return 'Scheduling conflict detected';
					}
				});

				toast({
					title: "Scheduling Conflict",
					description: conflictMessages.join('\n'),
					variant: "destructive"
				});
				return;
			}

			// If available, create or update the period
			if (period?.id) {
				updatePeriod(
					{ ...periodData, id: period.id },
					{
						onSuccess: (updatedPeriod) => {
							const periodWithDaysOfWeek = {
								...updatedPeriod[0],
								daysOfWeek: data.daysOfWeek
							};
							onSave(periodWithDaysOfWeek);
							onClose();
							toast({
								title: "Success",
								description: "Period updated successfully"
							});
						},
						onError: (error) => {
							toast({
								title: "Scheduling Conflict",
								description: error.message,
								variant: "destructive"
							});
						}

					}
				);
			} else {
				createPeriod(
					periodData,
					{
						onSuccess: (createdPeriods) => {
							const periodWithDaysOfWeek = {
								...createdPeriods[0],
								daysOfWeek: data.daysOfWeek
							};
							onSave(periodWithDaysOfWeek);
							onClose();
							toast({
								title: "Success",
								description: "Period created successfully"
							});
						},
						onError: (error) => {
							toast({
								title: "Scheduling Conflict",
								description: error.message,
								variant: "destructive"
							});
						}

					}
				);
			}
		} catch (error) {
			console.error('Error in form submission:', error);
			toast({
				title: "Error",
				description: error instanceof Error ? error.message : "Failed to process form submission",
				variant: "destructive"
			});
		}
	};

	useEffect(() => {
		if (period && isOpen) {
			form.reset({
				startTime: period.startTime ? new Date(period.startTime) : new Date(),
				endTime: period.endTime ? new Date(period.endTime) : new Date(),
				daysOfWeek: period.daysOfWeek ?? [1],
				durationInMinutes: period.durationInMinutes ?? 45,
				teacherId: period.teacherId ?? "",
				classroomId: period.classroomId ?? "",
				subjectId: period.subjectId ?? "",
				timetableId: timetableId
			});
		}
	}, [period, isOpen, timetableId, form]);

	return (
		<Dialog 
			open={isOpen} 
			onOpenChange={(open) => {
				if (!open) {
					form.reset();
					onClose();
				}
			}}
		>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{period ? 'Edit Period' : 'Add New Period'}</DialogTitle>
					<DialogDescription className="text-red-500">
						* All fields are required
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						{Object.keys(form.formState.errors).length > 0 && (
							<Alert variant="destructive" className="mb-4">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									Please fix the following errors:
									<ul className="list-disc list-inside mt-2">
										{Object.entries(form.formState.errors).map(([field, error]) => (
											<li key={field}>{error?.message}</li>
										))}
									</ul>
								</AlertDescription>
							</Alert>
						)}
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="startTime"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="flex items-center gap-1">
											Start Time <span className="text-red-500">*</span>
										</FormLabel>
										<FormControl>
											<Input 
												type="time" 
												name={field.name}
												ref={field.ref}
												onBlur={field.onBlur}
												value={field.value instanceof Date ? field.value.toTimeString().slice(0, 5) : ''}
												onChange={(e) => {
													const date = new Date(`1970-01-01T${e.target.value}`);
													field.onChange(date);
												}}
												className={form.formState.errors.startTime ? "border-red-500" : ""}
											/>
										</FormControl>
										<FormMessage className="text-red-500" />
										<p className="text-xs text-muted-foreground">Enter time in 24-hour format</p>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="endTime"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="flex items-center gap-1">
											End Time <span className="text-red-500">*</span>
										</FormLabel>
										<FormControl>
											<Input 
												type="time" 
												name={field.name}
												ref={field.ref}
												onBlur={field.onBlur}
												value={field.value instanceof Date ? field.value.toTimeString().slice(0, 5) : ''}
												onChange={(e) => {
													const date = new Date(`1970-01-01T${e.target.value}`);
													field.onChange(date);
												}}
												className={form.formState.errors.endTime ? "border-red-500" : ""}
											/>
										</FormControl>
										<FormMessage className="text-red-500" />
										<p className="text-xs text-muted-foreground">Enter time in 24-hour format</p>
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="daysOfWeek"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center gap-1">
										Days of Week <span className="text-red-500">*</span>
									</FormLabel>
									<FormControl>
										<MultiSelect
											options={DAYS.map((day, index) => ({
												label: day,
												value: index + 1
											}))}
											value={field.value}
											onChange={field.onChange}
											placeholder="Select days"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>


						<FormField
							control={form.control}
							name="teacherId"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center gap-1">
										Teacher <span className="text-red-500">*</span>
									</FormLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger>
											<SelectValue placeholder="Select a teacher" />
										</SelectTrigger>
										<SelectContent>
											{teachers?.map((teacher) => (
												<SelectItem key={teacher.id} value={teacher.id}>
													{teacher.name ?? 'Unknown'}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="classroomId"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center gap-1">
										Classroom <span className="text-red-500">*</span>
									</FormLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger>
											<SelectValue placeholder="Select a classroom" />
										</SelectTrigger>
										<SelectContent>
											{classrooms?.map((classroom) => (
												<SelectItem key={classroom.id} value={classroom.id}>
													{classroom.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="subjectId"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="flex items-center gap-1">
										Subject <span className="text-red-500">*</span>
									</FormLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger>
											<SelectValue placeholder="Select a subject" />
										</SelectTrigger>
										<SelectContent>
											{subjects?.map((subject) => (
												<SelectItem key={subject.id} value={subject.id}>
													{subject.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						{breakTimes.length > 0 && (
							<Alert>
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									Break times are scheduled for this day. Please ensure your period doesn't overlap.
								</AlertDescription>
							</Alert>
						)}

						<div className="flex justify-end space-x-2">
							<Button variant="outline" onClick={onClose}>
								Cancel
							</Button>
							<Button type="submit">
								{period ? 'Update Period' : 'Add Period'}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
