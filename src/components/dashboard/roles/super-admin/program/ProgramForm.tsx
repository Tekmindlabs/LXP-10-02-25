import { Button } from "@/components/ui/button";

interface ProgramSubmissionProps {
	isSubmitting: boolean;
	isEditing: boolean;
	onSubmit: (e: React.FormEvent) => void;
}

export const ProgramSubmission = ({ isSubmitting, isEditing, onSubmit }: ProgramSubmissionProps) => {
	return (
		<form onSubmit={onSubmit} className="space-y-4"></form>
			<Button type="submit" className="w-full" disabled={isSubmitting}>
				{isSubmitting ? 'Saving...' : isEditing ? "Update" : "Create"} Program
			</Button>
		</form>
	);
};
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssessmentSystemType } from "@/types/assessment";
import { ProgramFormData } from "@/types/program";

interface AssessmentSystemProps {
	formData: ProgramFormData;
	onFormDataChange: (newData: Partial<ProgramFormData>) => void;
}

export const AssessmentSystem = ({ formData, onFormDataChange }: AssessmentSystemProps) => {
	const handleAssessmentTypeChange = (type: AssessmentSystemType) => {
		onFormDataChange({
			assessmentSystem: {
				...formData.assessmentSystem,
				type
			}
		});
	};

	return (
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

			{/* Render assessment type specific fields */}
			{formData.assessmentSystem.type === AssessmentSystemType.MARKING_SCHEME && (
				<div className="space-y-4"></div>
					{/* Marking scheme fields */}
					{/* ... (keep existing marking scheme JSX) ... */}
				</div>
			)}

			{formData.assessmentSystem.type === AssessmentSystemType.RUBRIC && (
				<div className="space-y-4">
					{/* Rubric fields */}
					{/* ... (keep existing rubric JSX) ... */}
				</div>
			)}

			{formData.assessmentSystem.type === AssessmentSystemType.CGPA && (
				<div className="space-y-4"></div>
					{/* CGPA fields */}
					{/* ... (keep existing CGPA JSX) ... */}
				</div>
			)}
		</div>
	);
};
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
		<>
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
		</>
	);
};

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { api } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import type { TRPCClientErrorLike } from "@trpc/client";
import { useTermSystem } from "./hooks/useTermSystem";
import { BasicInformation } from "./components/BasicInformation";
import { TermSystemSection } from "./components/TermSystemSection";
import { AssessmentSystem } from "./components/AssessmentSystem";
import { ProgramSubmission } from "./components/ProgramSubmission";
import { defaultFormData } from "@/constants/program";
import { ProgramFormData, ProgramFormProps } from "@/types/program";
import { AssessmentSystemType } from "@/types/assessment";


const termConfigs: Record<TermSystemType, { terms: Array<{ name: string }> }> = {
	SEMESTER: {
		terms: [
			{ name: 'Semester 1' },
			{ name: 'Semester 2' }
		]
	},
	TERM: {
		terms: [
			{ name: 'Term 1' },
			{ name: 'Term 2' },
			{ name: 'Term 3' }
		]
	},
	QUARTER: {
		terms: [
			{ name: 'Quarter 1' },
			{ name: 'Quarter 2' },
			{ name: 'Quarter 3' },
			{ name: 'Quarter 4' }
		]
	}
};


interface ProgramFormData {
	name: string;
	description?: string;
	calendarId: string;
	coordinatorId?: string;
	status: Status;
	termSystem?: {
		type: TermSystemType;
		terms: Array<{
			name: string;
			startDate: Date;
			endDate: Date;
			type: TermSystemType;
			assessmentPeriods: Array<{
				name: string;
				startDate: Date;
				endDate: Date;
				weight: number;
			}>;
		}>;
	};
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
		cgpaConfig?: {
			gradePoints: Array<{
				grade: string;
				points: number;
				minPercentage: number;
				maxPercentage: number;
			}>;
			semesterWeightage: boolean;
			includeBacklogs: boolean;
		};
	};
}

interface ProgramFormProps {
	selectedProgram?: any;
	coordinators: any[];
	onSuccess: () => void;
}

const defaultCGPAConfig = {
	gradePoints: [
		{ grade: 'A+', points: 4.0, minPercentage: 90, maxPercentage: 100 },
		{ grade: 'A', points: 3.7, minPercentage: 85, maxPercentage: 89 },
		{ grade: 'A-', points: 3.3, minPercentage: 80, maxPercentage: 84 },
		{ grade: 'B+', points: 3.0, minPercentage: 75, maxPercentage: 79 },
		{ grade: 'B', points: 2.7, minPercentage: 70, maxPercentage: 74 },
		{ grade: 'C+', points: 2.3, minPercentage: 65, maxPercentage: 69 },
		{ grade: 'C', points: 2.0, minPercentage: 60, maxPercentage: 64 },
		{ grade: 'D', points: 1.0, minPercentage: 50, maxPercentage: 59 },
		{ grade: 'F', points: 0.0, minPercentage: 0, maxPercentage: 49 }
	],
	semesterWeightage: false,
	includeBacklogs: false
};

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
	const [formData, setFormData] = useState<ProgramFormData>(() => {
		if (!selectedProgram) return defaultFormData;

		const transformedTermSystem = selectedProgram.termStructures ? {
			type: selectedProgram.termSystem,
			terms: selectedProgram.termStructures.map((structure) => ({
				name: structure.name,
				startDate: new Date(structure.startDate),
				endDate: new Date(structure.endDate),
				type: selectedProgram.termSystem,
				assessmentPeriods: structure.academicTerms?.[0]?.assessmentPeriods?.map((period) => ({
					name: period.name,
					startDate: new Date(period.startDate),
					endDate: new Date(period.endDate),
					weight: period.weight
				})) || []
			}))
		} : defaultFormData.termSystem;

		return {
			name: selectedProgram.name,
			description: selectedProgram.description || "",
			calendarId: selectedProgram.calendarId,
			coordinatorId: selectedProgram.coordinatorId || "NO_SELECTION",
			status: selectedProgram.status,
			termSystem: transformedTermSystem,
			assessmentSystem: selectedProgram.assessmentSystem || defaultFormData.assessmentSystem
		};
	});


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

	const { 
		termSystem,
		handleTermSystemTypeChange,
		handleAddTerm,
		handleRemoveTerm,
		handleTermChange
	} = useTermSystem(formData.termSystem);


	const resetForm = () => {
		setFormData({
			name: "",
			description: "",
			calendarId: "NO_SELECTION",
			coordinatorId: "NO_SELECTION",
			status: Status.ACTIVE,
			termSystem: {
				type: "SEMESTER",
				terms: [
					{
						name: "Semester 1",
						startDate: new Date(),
						endDate: new Date(),
						type: "SEMESTER",
						assessmentPeriods: []
					},
					{
						name: "Semester 2",
						startDate: new Date(),
						endDate: new Date(),
						type: "SEMESTER",
						assessmentPeriods: []
					}
				]
			},
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
		} else if (formData.assessmentSystem.type === AssessmentSystemType.CGPA) {
			const { cgpaConfig } = formData.assessmentSystem;
			if (!cgpaConfig || !cgpaConfig.gradePoints.length) {
				toast({
					title: "Error",
					description: "CGPA grade points configuration is required",
					variant: "destructive",
				});
				return false;
			}

			// Validate grade points
			for (const grade of cgpaConfig.gradePoints) {
				if (!grade.grade || grade.points < 0 || grade.minPercentage < 0 || grade.maxPercentage > 100) {
					toast({
						title: "Error",
						description: "Invalid grade points configuration",
						variant: "destructive",
					});
					return false;
				}
			}
		}

		if (formData.assessmentSystem.type === AssessmentSystemType.CGPA) {
			if (!formData.termSystem) {
				toast({
					title: "Error",
					description: "Term system configuration is required for CGPA",
					variant: "destructive",
				});
				return false;
			}

			// Validate term dates
			for (const term of formData.termSystem.terms) {
				if (term.startDate >= term.endDate) {
					toast({
						title: "Error",
						description: `Invalid date range for ${term.name}`,
						variant: "destructive",
					});
					return false;
				}
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
				} : type === AssessmentSystemType.RUBRIC ? {
					rubric: defaultRubric
				} : type === AssessmentSystemType.CGPA ? {
					cgpaConfig: defaultCGPAConfig
				} : {})
			}
		});
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!validateForm()) {
			return;
		}

		const submissionData = {
			name: formData.name,
			description: formData.description,
			calendarId: formData.calendarId,
			coordinatorId: formData.coordinatorId === "NO_SELECTION" ? undefined : formData.coordinatorId,
			status: formData.status,
			termSystem: formData.termSystem,
			termStructures: formData.termSystem?.terms.map(term => ({
				name: term.name,
				startDate: term.startDate,
				endDate: term.endDate,
				academicTerms: [{
					assessmentPeriods: term.assessmentPeriods.map(period => ({
						name: period.name,
						startDate: period.startDate,
						endDate: period.endDate,
						weight: period.weight
					}))
				}]
			})),
			assessmentSystem: formData.assessmentSystem
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
				<ProgramSubmission 
					isSubmitting={createMutation.status === 'pending' || updateMutation.status === 'pending'}
					isEditing={!!selectedProgram}
					onSubmit={handleSubmit}
				>
					<BasicInformation
						formData={formData}
						calendars={calendars || []}
						coordinators={coordinators}
						onFormDataChange={handleFormDataChange}
					/>

					<TermSystemSection
						termSystem={termSystem}
						onTermSystemTypeChange={handleTermSystemTypeChange}
						onAddTerm={handleAddTerm}
						onRemoveTerm={handleRemoveTerm}
						onTermChange={handleTermChange}
					/>

					<AssessmentSystem
						formData={formData}
						onFormDataChange={handleFormDataChange}
					/>
				</ProgramSubmission>
			</CardContent>
		</Card>
	);


};
