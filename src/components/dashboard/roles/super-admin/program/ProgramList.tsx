"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/utils/api";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AssessmentSystemType } from "@/types/assessment";

interface ProgramListProps {
	programs: Array<{
		id: string;
		name: string | null;
		description?: string | null;
		status: string;
		calendar?: { name: string; } | null;
		coordinator?: { user: { name: string | null; }; } | null;
		classGroups?: any[];
		assessmentSystem?: {
			type: AssessmentSystemType;
			markingSchemes?: any[];
			rubrics?: any[];
		} | null;
		termStructures?: Array<{
			name: string;
			type: 'semesterBased' | 'termBased';
			startDate: Date;
			endDate: Date;
		}>;
	}>;
	onSelect: (id: string) => void;
	onEdit: (id: string) => void;
}

export const ProgramList = ({
	programs,
	onSelect,
	onEdit,
}: ProgramListProps) => {
	const [programToDelete, setProgramToDelete] = useState<string | null>(null);
	const { toast } = useToast();
	const utils = api.useContext();

	const deleteMutation = api.program.delete.useMutation({
		onSuccess: () => {
			toast({
				title: "Success",
				description: "Program deleted successfully"
			});
			utils.program.getAll.invalidate();
			utils.program.searchPrograms.invalidate();
			setProgramToDelete(null);
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive"
			});
			setProgramToDelete(null);
		},
	});

	const handleDelete = (programId: string) => {
		setProgramToDelete(programId);
	};

	const confirmDelete = () => {
		if (programToDelete) {
			deleteMutation.mutate(programToDelete);
		}
	};

	return (
		<div className="space-y-4">
			{programs.map((program) => (
				<Card key={program.id}>
					<CardHeader>
						<div className="flex justify-between items-center">
							<CardTitle>{program.name}</CardTitle>
							<div className="flex space-x-2">
								<Button 
									variant="secondary" 
									size="sm" 
									onClick={() => onSelect(program.id)}
								>
									View
								</Button>
								<Button 
									variant="outline" 
									size="sm" 
									onClick={() => onEdit(program.id)}
								>
									Edit
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => handleDelete(program.id)}
									disabled={deleteMutation.isPending}
								>
									{deleteMutation.isPending ? "Deleting..." : "Delete"}
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<p>{program.description}</p>
							<p>Calendar: {program.calendar?.name || 'Not assigned'}</p>
							<p>Coordinator: {program.coordinator?.user.name || 'Not assigned'}</p>
							<p>Status: {program.status}</p>
							<p>Class Groups: {program.classGroups?.length || 0}</p>
							
							{program.assessmentSystem && (
								<div className="mt-4 space-y-2">
									<h4 className="font-semibold">Assessment System</h4>
									<p>Type: {program.assessmentSystem.type.replace('_', ' ')}</p>
									
									{program.assessmentSystem.type === AssessmentSystemType.MARKING_SCHEME && program.assessmentSystem.markingSchemes && program.assessmentSystem.markingSchemes[0] && (
										<div className="pl-4">
											<p>Max Marks: {program.assessmentSystem.markingSchemes[0].maxMarks}</p>
											<p>Passing Marks: {program.assessmentSystem.markingSchemes[0].passingMarks}</p>
											<div className="mt-2">
												<p className="font-medium">Grading Scale:</p>
												<div className="grid grid-cols-3 gap-2 text-sm">
													{program.assessmentSystem.markingSchemes[0].gradingScale.map((grade: { grade: string; minPercentage: number; maxPercentage: number }, index: number) => (
														<div key={index} className="bg-secondary p-1 rounded">
															{grade.grade}: {grade.minPercentage}%-{grade.maxPercentage}%
														</div>
													))}
												</div>
											</div>
										</div>
									)}
									
									{program.assessmentSystem.type === AssessmentSystemType.RUBRIC && program.assessmentSystem.rubrics && program.assessmentSystem.rubrics[0] && (
										<div className="pl-4">
											<p>Rubric Name: {program.assessmentSystem.rubrics[0].name}</p>
											<p>Criteria Count: {program.assessmentSystem.rubrics[0].criteria.length}</p>
										</div>
									)}

									{program.assessmentSystem.type === AssessmentSystemType.CGPA && program.termStructures && (
										<div className="mt-2">
											<p className="font-medium">Term System: {program.termStructures[0].type === 'semesterBased' ? 'Semester Based' : 'Term Based'}</p>
											<div className="grid gap-1 mt-1">
												{program.termStructures.map((termStructure, index) => (
													<div key={index} className="text-sm">
														{termStructure.name}: {new Date(termStructure.startDate).toLocaleDateString()} - {new Date(termStructure.endDate).toLocaleDateString()}
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			))}

			<Dialog open={!!programToDelete} onOpenChange={() => setProgramToDelete(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Program</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this program? This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setProgramToDelete(null)}>
							Cancel
						</Button>
						<Button 
							variant="destructive" 
							onClick={confirmDelete}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

