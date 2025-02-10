"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { api } from "@/utils/api";
import { Status } from "@prisma/client";
import { toast } from "@/hooks/use-toast";
import type { TRPCClientErrorLike } from "@trpc/client";
import { AssessmentSystemType } from "@/types/assessment";


interface ProgramFormData {
	name: string;
	description?: string;
	calendarId: string;
	coordinatorId?: string;
	status: Status;
	assessmentSystem: {
		type: AssessmentSystemType;
		markingScheme?: {
			maxMarks: number;
			passingMarks: number;
			gradingScale: Array<{
				grade: string;
				minPercentage: number;
				maxPercentage: number;
			}>;
		};
		rubric?: {
			name: string;
			description?: string;
			criteria: Array<{
				name: string;
				description?: string;
				levels: Array<{
					name: string;
					points: number;
					description?: string;
				}>;
			}>;
		};
	};
}

interface ProgramFormProps {
	selectedProgram?: any;
	coordinators: any[];
	onSuccess: () => void;
}

const defaultRubric = {
	name: 'Default Rubric',
	description: '',
	criteria: [
		{
			name: 'Quality',
			description: '',
			levels: [
				{ name: 'Excellent', points: 4, description: '' },
				{ name: 'Good', points: 3, description: '' },
				{ name: 'Fair', points: 2, description: '' },
				{ name: 'Poor', points: 1, description: '' }
			]
		}
	]
};

export const ProgramForm = ({ selectedProgram, coordinators, onSuccess }: ProgramFormProps) => {
	const [formData, setFormData] = useState<ProgramFormData>(() => ({
		name: selectedProgram?.name || "",
		description: selectedProgram?.description || "",
		calendarId: selectedProgram?.calendarId || "NO_SELECTION",
		coordinatorId: selectedProgram?.coordinatorId || "NO_SELECTION",
		status: selectedProgram?.status || Status.ACTIVE,
		assessmentSystem: selectedProgram?.assessmentSystem || {
			type: AssessmentSystemType.MARKING_SCHEME,
			markingScheme: {
				maxMarks: 100,
				passingMarks: 40,
				gradingScale: [
					{ grade: 'A', minPercentage: 80, maxPercentage: 100 },
					{ grade: 'B', minPercentage: 70, maxPercentage: 79 },
					{ grade: 'C', minPercentage: 60, maxPercentage: 69 },
					{ grade: 'D', minPercentage: 50, maxPercentage: 59 },
					{ grade: 'E', minPercentage: 40, maxPercentage: 49 },
					{ grade: 'F', minPercentage: 0, maxPercentage: 39 }
				]
			}
		}
	}));

	const { 
		data: calendars, 
		isLoading: calendarsLoading,
		error: calendarsError 
	} = api.academicCalendar.getAllCalendars.useQuery(undefined, {
		retry: 1,
		refetchOnWindowFocus: false
	});
	const utils = api.useContext();

	const createMutation = api.program.create.useMutation({
		onSuccess: () => {
			utils.program.getAll.invalidate();
			resetForm();
			onSuccess();
			toast({
				title: "Success",
				description: "Program created successfully",
			});
		},
		onError: (error: TRPCClientErrorLike<any>) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const updateMutation = api.program.update.useMutation({
		onSuccess: () => {
			utils.program.getAll.invalidate();
			resetForm();
			onSuccess();
			toast({
				title: "Success",
				description: "Program updated successfully",
			});
		},
		onError: (error: TRPCClientErrorLike<any>) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const resetForm = () => {
		setFormData({
			name: "",
			description: "",
			calendarId: "NO_SELECTION",
			coordinatorId: "NO_SELECTION",
			status: Status.ACTIVE,
			assessmentSystem: {
				type: AssessmentSystemType.MARKING_SCHEME,
				markingScheme: {
					maxMarks: 100,
					passingMarks: 40,
					gradingScale: [
						{ grade: 'A', minPercentage: 80, maxPercentage: 100 },
						{ grade: 'B', minPercentage: 70, maxPercentage: 79 },
						{ grade: 'C', minPercentage: 60, maxPercentage: 69 },
						{ grade: 'D', minPercentage: 50, maxPercentage: 59 },
						{ grade: 'E', minPercentage: 40, maxPercentage: 49 },
						{ grade: 'F', minPercentage: 0, maxPercentage: 39 }
					]
				}
			}
		});
	};

	const validateForm = () => {
		if (!formData.name.trim()) {
			toast({
				title: "Error",
				description: "Program name is required",
				variant: "destructive",
			});
			return false;
		}

		if (formData.calendarId === "NO_SELECTION") {
			toast({
				title: "Error",
				description: "Calendar selection is required",
				variant: "destructive",
			});
			return false;
		}

		if (formData.assessmentSystem.type === AssessmentSystemType.MARKING_SCHEME) {
			const { markingScheme } = formData.assessmentSystem;
			if (!markingScheme || markingScheme.maxMarks <= 0 || markingScheme.passingMarks <= 0) {
				toast({
					title: "Error",
					description: "Invalid marking scheme configuration",
					variant: "destructive",
				});
				return false;
			}
		} else if (formData.assessmentSystem.type === AssessmentSystemType.RUBRIC) {
			const { rubric } = formData.assessmentSystem;
			if (!rubric || !rubric.name || !rubric.criteria.length) {
				toast({
					title: "Error",
					description: "Invalid rubric configuration",
					variant: "destructive",
				});
				return false;
			}
		}

		return true;
	};

	const handleAssessmentTypeChange = (type: AssessmentSystemType) => {
		setFormData({
			...formData,
			assessmentSystem: {
				type,
				...(type === AssessmentSystemType.MARKING_SCHEME ? {
					markingScheme: {
						maxMarks: 100,
						passingMarks: 40,
						gradingScale: [
							{ grade: 'A', minPercentage: 80, maxPercentage: 100 },
							{ grade: 'B', minPercentage: 70, maxPercentage: 79 },
							{ grade: 'C', minPercentage: 60, maxPercentage: 69 },
							{ grade: 'D', minPercentage: 50, maxPercentage: 59 },
							{ grade: 'E', minPercentage: 40, maxPercentage: 49 },
							{ grade: 'F', minPercentage: 0, maxPercentage: 39 }
						]
					}
				} : {
					rubric: defaultRubric
				})
			}
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!validateForm()) {
			return;
		}

		const submissionData = {
			...formData,
			coordinatorId: formData.coordinatorId === "NO_SELECTION" ? undefined : formData.coordinatorId,
		};

		if (selectedProgram) {
			updateMutation.mutate({
				id: selectedProgram.id,
				...submissionData,
			});
		} else {
			createMutation.mutate(submissionData);
		}
	};


	if (calendarsError) {
		return (
			<Alert variant="destructive">
				<AlertDescription>
					Error loading calendars: {calendarsError.message}
				</AlertDescription>
			</Alert>
		);
	}

	if (calendarsLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	return (
		<Card className="mt-4">
			<CardHeader>
				<CardTitle>{selectedProgram ? "Edit" : "Create"} Program</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
							required
						/>
					</div>

					<div>
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) => setFormData({ ...formData, description: e.target.value })}
						/>
					</div>

					<div>
						<Label htmlFor="calendar">Calendar</Label>
						<Select
							value={formData.calendarId}
							onValueChange={(value) => setFormData({ ...formData, calendarId: value })}
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
							onValueChange={(value) => setFormData({ ...formData, coordinatorId: value })}
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
							onValueChange={(value) => setFormData({ ...formData, status: value as Status })}
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

					<div className="space-y-4 border p-4 rounded-lg">
						<h3 className="text-lg font-semibold">Assessment System</h3>
						
						<div>
							<Label>Assessment Type</Label>
							<Select
								value={formData.assessmentSystem.type}
								onValueChange={handleAssessmentTypeChange}

							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Select Assessment Type" />
								</SelectTrigger>
								<SelectContent>
									{Object.values(AssessmentSystemType).map((type) => (
										<SelectItem key={type} value={type}>
											{type.replace('_', ' ')}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{formData.assessmentSystem.type === AssessmentSystemType.MARKING_SCHEME && (
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label>Maximum Marks</Label>
										<Input
											type="number"
											value={formData.assessmentSystem.markingScheme?.maxMarks}
											onChange={(e) => setFormData({
												...formData,
												assessmentSystem: {
													...formData.assessmentSystem,
													markingScheme: {
														...formData.assessmentSystem.markingScheme!,
														maxMarks: Number(e.target.value)
													}
												}
											})}
										/>
									</div>
									<div>
										<Label>Passing Marks</Label>
										<Input
											type="number"
											value={formData.assessmentSystem.markingScheme?.passingMarks}
											onChange={(e) => setFormData({
												...formData,
												assessmentSystem: {
													...formData.assessmentSystem,
													markingScheme: {
														...formData.assessmentSystem.markingScheme!,
														passingMarks: Number(e.target.value)
													}
												}
											})}
										/>
									</div>
								</div>

								<div>
									<Label>Grading Scale</Label>
									{formData.assessmentSystem.markingScheme?.gradingScale.map((grade, index) => (
										<div key={index} className="grid grid-cols-3 gap-2 mt-2">
											<Input
												placeholder="Grade"
												value={grade.grade}
												onChange={(e) => {
													const newScale = [...formData.assessmentSystem.markingScheme!.gradingScale];
													newScale[index] = { ...grade, grade: e.target.value };
													setFormData({
														...formData,
														assessmentSystem: {
															...formData.assessmentSystem,
															markingScheme: {
																...formData.assessmentSystem.markingScheme!,
																gradingScale: newScale
															}
														}
													});
												}}
											/>
											<Input
												type="number"
												placeholder="Min %"
												value={grade.minPercentage}
												onChange={(e) => {
													const newScale = [...formData.assessmentSystem.markingScheme!.gradingScale];
													newScale[index] = { ...grade, minPercentage: Number(e.target.value) };
													setFormData({
														...formData,
														assessmentSystem: {
															...formData.assessmentSystem,
															markingScheme: {
																...formData.assessmentSystem.markingScheme!,
																gradingScale: newScale
															}
														}
													});
												}}
											/>
											<Input
												type="number"
												placeholder="Max %"
												value={grade.maxPercentage}
												onChange={(e) => {
													const newScale = [...formData.assessmentSystem.markingScheme!.gradingScale];
													newScale[index] = { ...grade, maxPercentage: Number(e.target.value) };
													setFormData({
														...formData,
														assessmentSystem: {
															...formData.assessmentSystem,
															markingScheme: {
																...formData.assessmentSystem.markingScheme!,
																gradingScale: newScale
															}
														}
													});
												}}
											/>
										</div>
									))}
								</div>
							</div>
						)}

						{formData.assessmentSystem.type === AssessmentSystemType.RUBRIC && (
							<div className="space-y-4">
								<div>
									<Label>Rubric Name</Label>
									<Input
										value={formData.assessmentSystem.rubric?.name || ''}
										onChange={(e) => setFormData({
											...formData,
											assessmentSystem: {
												...formData.assessmentSystem,
												rubric: {
													...formData.assessmentSystem.rubric!,
													name: e.target.value
												}
											}
										})}
									/>
								</div>

								<div>
									<Label>Criteria</Label>
									{formData.assessmentSystem.rubric?.criteria.map((criterion, index) => (
										<div key={index} className="space-y-2 mt-2 p-2 border rounded">
											<Input
												placeholder="Criterion Name"
												value={criterion.name}
												onChange={(e) => {
													const newCriteria = [...formData.assessmentSystem.rubric!.criteria];
													newCriteria[index] = { ...criterion, name: e.target.value };
													setFormData({
														...formData,
														assessmentSystem: {
															...formData.assessmentSystem,
															rubric: {
																...formData.assessmentSystem.rubric!,
																criteria: newCriteria
															}
														}
													});
												}}
											/>
											
											<div className="space-y-2">
												{criterion.levels.map((level, levelIndex) => (
													<div key={levelIndex} className="grid grid-cols-2 gap-2">
														<Input
															placeholder="Level Name"
															value={level.name}
															onChange={(e) => {
																const newCriteria = [...formData.assessmentSystem.rubric!.criteria];
																newCriteria[index].levels[levelIndex] = {
																	...level,
																	name: e.target.value
																};
																setFormData({
																	...formData,
																	assessmentSystem: {
																		...formData.assessmentSystem,
																		rubric: {
																			...formData.assessmentSystem.rubric!,
																			criteria: newCriteria
																		}
																	}
																});
															}}
														/>
														<Input
															type="number"
															placeholder="Points"
															value={level.points}
															onChange={(e) => {
																const newCriteria = [...formData.assessmentSystem.rubric!.criteria];
																newCriteria[index].levels[levelIndex] = {
																	...level,
																	points: Number(e.target.value)
																};
																setFormData({
																	...formData,
																	assessmentSystem: {
																		...formData.assessmentSystem,
																		rubric: {
																			...formData.assessmentSystem.rubric!,
																			criteria: newCriteria
																		}
																	}
																});
															}}
														/>
													</div>
												))}
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					<Button type="submit" className="w-full" disabled={createMutation.status === 'pending' || updateMutation.status === 'pending'}>
						{createMutation.status === 'pending' || updateMutation.status === 'pending' ? 'Saving...' : selectedProgram ? "Update" : "Create"} Program
					</Button>
				</form>
			</CardContent>
		</Card>
	);

};
