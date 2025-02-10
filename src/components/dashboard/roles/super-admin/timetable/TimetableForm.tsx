import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/utils/api";
import { TimetableInput, timetableInputSchema, isTimeOverlapping } from "@/types/timetable";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { useState } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const BREAK_TYPES = [
	{ value: "SHORT_BREAK", label: "Short Break" },
	{ value: "LUNCH_BREAK", label: "Lunch Break" }
];

export function TimetableForm() {
	const [selectedClassGroupId, setSelectedClassGroupId] = useState<string>("");

	const form = useForm<TimetableInput>({
		resolver: zodResolver(timetableInputSchema),
		defaultValues: {
			startTime: "08:00",
			endTime: "15:00",
			breakTimes: DAYS.map((_, index) => [
				{ startTime: "10:30", endTime: "10:45", type: "SHORT_BREAK" as const, dayOfWeek: index + 1 },
				{ startTime: "12:30", endTime: "13:15", type: "LUNCH_BREAK" as const, dayOfWeek: index + 1 }
			]).flat(),
			periods: [],
			academicCalendarId: ""
		}
	});

	const { data: academicCalendars } = api.academicCalendar.getAllCalendars.useQuery();
	const { data: terms } = api.term.getAll.useQuery();
	const { data: classGroups } = api.classGroup.list.useQuery();
	const { data: classes } = api.class.search.useQuery(
		{ classGroupId: selectedClassGroupId },
		{ enabled: !!selectedClassGroupId }
	);

	const validateTimetable = (data: TimetableInput) => {
		// Validate start/end times
		if (data.startTime >= data.endTime) {
			form.setError("endTime", {
				message: "End time must be after start time"
			});
			return false;
		}
		
		// Validate break times
		const isBreakTimesValid = data.breakTimes.every(breakTime => {
			const isValid = breakTime.startTime < breakTime.endTime &&
				breakTime.startTime >= data.startTime &&
				breakTime.endTime <= data.endTime;
			
			if (!isValid) {
				form.setError(`breakTimes.${data.breakTimes.indexOf(breakTime)}.endTime`, {
					message: "Break time must be within daily schedule and end after start"
				});
			}
			return isValid;
		});

		// Check for overlapping break times
		const hasOverlappingBreaks = data.breakTimes.some((break1, index1) =>
			data.breakTimes.some((break2, index2) =>
				index1 !== index2 &&
				break1.dayOfWeek === break2.dayOfWeek &&
				isTimeOverlapping(
					break1.startTime,
					break1.endTime,
					break2.startTime,
					break2.endTime
				)
			)
		);

		if (hasOverlappingBreaks) {
			toast({
				title: "Invalid Break Times",
				description: "Break times cannot overlap on the same day",
				variant: "destructive"
			});
			return false;
		}

		return isBreakTimesValid;
	};

	const onSubmit = async (data: TimetableInput) => {
		if (!validateTimetable(data)) {
			return;
		}
		createTimetable(data);
	};

	const { mutate: createTimetable } = api.timetable.create.useMutation({
		onSuccess: () => {
			toast({
				title: "Success",
				description: "Timetable created successfully"
			});
			form.reset();
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive"
			});
		}
	});




	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<Card>
					<CardContent className="pt-6">
						<div className="grid grid-cols-1 gap-4">
							<FormField
								control={form.control}
								name="academicCalendarId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Academic Calendar</FormLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger>
												<SelectValue placeholder="Select an academic calendar" />
											</SelectTrigger>
											<SelectContent>
												{academicCalendars?.map((calendar) => (
													<SelectItem key={calendar.id} value={calendar.id}>
														{calendar.name}
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
								name="termId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Term</FormLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger>
												<SelectValue placeholder="Select a term" />
											</SelectTrigger>
											<SelectContent>
												{terms?.map((term) => (
													<SelectItem key={term.id} value={term.id}>
														{term.name}
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
								name="classGroupId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Class Group</FormLabel>
										<Select 
											value={field.value} 
											onValueChange={(value) => {
												field.onChange(value);
												setSelectedClassGroupId(value);
											}}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select a class group" />
											</SelectTrigger>
											<SelectContent>
												{classGroups?.map((group: { id: string; name: string }) => (
													<SelectItem key={group.id} value={group.id}>
														{group.name}
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
								name="classId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Class</FormLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger>
												<SelectValue placeholder="Select a class" />
											</SelectTrigger>
											<SelectContent>
												{classes?.map((class_: { id: string; name: string }) => (
													<SelectItem key={class_.id} value={class_.id}>
														{class_.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="pt-6">
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="startTime"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Daily Start Time</FormLabel>
										<FormControl>
											<Input type="time" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="endTime"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Daily End Time</FormLabel>
										<FormControl>
											<Input type="time" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="pt-6">
						<div className="space-y-4">
							<div className="flex justify-between items-center">
								<h3 className="text-lg font-medium">Break Times</h3>
							</div>

							<Alert>
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									Configure break times for each day separately
								</AlertDescription>
							</Alert>

							{DAYS.map((day, dayIndex) => (
								<div key={day} className="space-y-4">
									<div className="flex justify-between items-center">
										<h4 className="font-medium">{day}</h4>
										<Button 
											type="button" 
											variant="outline" 
											size="sm" 
											onClick={() => {
												const currentBreakTimes = form.getValues("breakTimes") || [];
												form.setValue("breakTimes", [
													...currentBreakTimes,
													{ 
														startTime: "", 
														endTime: "", 
														type: "SHORT_BREAK" as const, 
														dayOfWeek: dayIndex + 1 
													}
												]);
											}}
										>
											<Plus className="h-4 w-4 mr-2" />
											Add Break
										</Button>
									</div>

									{form.watch("breakTimes")
										?.filter(breakTime => breakTime.dayOfWeek === dayIndex + 1)
										.map((_, index) => {
											const breakIndex = form.getValues("breakTimes")
												.findIndex(bt => bt.dayOfWeek === dayIndex + 1) + index;
											
											return (
												<div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end">
													<FormField
														control={form.control}
														name={`breakTimes.${breakIndex}.startTime`}
														render={({ field }) => (
															<FormItem>
																<FormLabel>Start Time</FormLabel>
																<FormControl>
																	<Input type="time" {...field} />
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
													<FormField
														control={form.control}
														name={`breakTimes.${breakIndex}.endTime`}
														render={({ field }) => (
															<FormItem>
																<FormLabel>End Time</FormLabel>
																<FormControl>
																	<Input type="time" {...field} />
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
													<FormField
														control={form.control}
														name={`breakTimes.${breakIndex}.type`}
														render={({ field }) => (
															<FormItem>
																<FormLabel>Type</FormLabel>
																<Select value={field.value} onValueChange={field.onChange}>
																	<SelectTrigger>
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		{BREAK_TYPES.map(type => (
																			<SelectItem key={type.value} value={type.value}>
																				{type.label}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
																<FormMessage />
															</FormItem>
														)}
													/>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="text-destructive"
														onClick={() => {
															const currentBreakTimes = form.getValues("breakTimes");
															form.setValue(
																"breakTimes",
																currentBreakTimes.filter((_, i) => i !== breakIndex)
															);
														}}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											);
									})}
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<div className="flex justify-end">
					<Button type="submit">Create Timetable</Button>
				</div>
			</form>
		</Form>
	);
}
