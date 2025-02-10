"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { columns, type ClassGroup } from "@/components/dashboard/roles/super-admin/class-group/columns";
import { api } from "@/utils/api";
import { AssessmentSystemType } from "@/types/assessment";
import { Status, CalendarType, Visibility } from "@prisma/client";
import type { JsonValue } from "@prisma/client/runtime/library";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProgramViewProps {
	programId: string;
	onBack: () => void;
	onEdit: () => void;
}

type ProgramResponse = {
	id: string;
	name: string | null;
	description: string | null;
	status: Status;
	calendar: {
		description: string | null;
		status: Status;
		type: CalendarType;
		name: string;
		id: string;
		createdAt: Date;
		updatedAt: Date;
		startDate: Date;
		endDate: Date;
		isDefault: boolean;
		visibility: Visibility;
		metadata: JsonValue;
		academicYearId: string | null;
	};
	classGroups: Array<{
		id: string;
		name: string;
		program: {
			id: string;
			name: string;
		};
		subjects: any[];
		status: Status;
		classes: Array<{
			students: Array<{
				id: string;
			}>;
		}>;
	}>;
	coordinator: {
		user: {
			name: string | null;
		};
	} | null;
	assessmentSystem: {
		type: AssessmentSystemType;
		markingSchemes: Array<{
			maxMarks: number;
			passingMarks: number;
			gradingScale: Array<{
				grade: string;
				minPercentage: number;
				maxPercentage: number;
			}>;
		}>;
		rubrics: Array<{
			name: string;
			criteria: Array<{
				name: string;
				description?: string;
				levels: Array<{
					name: string;
					points: number;
				}>;
			}>;
		}>;
	} | null;
};

export function ProgramView({ programId, onBack, onEdit = () => {} }: ProgramViewProps) {
	const { 
		data: program, 
		isLoading: programLoading, 
		error: programError 
	} = api.program.getById.useQuery(
		programId,
		{
			retry: 1,
			refetchOnWindowFocus: false
		}
	) as unknown as { data: ProgramResponse; isLoading: boolean; error: any };
	
	const { 
		data: classGroups, 
		isLoading: classGroupsLoading,
		error: classGroupsError 
	} = api.classGroup.getByProgramId.useQuery(
		{ programId },
		{
			retry: 1,
			refetchOnWindowFocus: false,
			enabled: !!program
		}
	) as unknown as { data: ProgramResponse['classGroups']; isLoading: boolean; error: any };

	if (programLoading || classGroupsLoading) {
		return (
			<div className="flex items-center justify-center h-[400px]">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (programError) {
		return (
			<Alert variant="destructive">
				<AlertDescription>
					Error loading program: {programError.message}
				</AlertDescription>
			</Alert>
		);
	}

	if (!program) {
		return (
			<Alert>
				<AlertDescription>Program not found</AlertDescription>
			</Alert>
		);
	}

	if (classGroupsError) {
		return (
			<Alert variant="destructive">
				<AlertDescription>
					Error loading class groups: {classGroupsError.message}
				</AlertDescription>
			</Alert>
		);
	}

	const studentsByGroup = classGroups?.map((group) => ({
		name: group.name,
		students: group.classes.reduce((acc, cls) => 
			acc + (cls.students?.length ?? 0), 0
		)
	})) ?? [];


	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-3xl font-bold">{program.name}</h2>
				<div className="flex gap-2">
					<button
						onClick={onEdit}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
					>
						Edit Program
					</button>
					<button
						onClick={onBack}
						className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
					>
						Back to Programs
					</button>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Program Details</CardTitle>
					</CardHeader>
					<CardContent>
						<dl className="space-y-2">
							<div>
								<dt className="text-sm font-medium text-gray-500">Description</dt>
								<dd>{program.description}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-500">Coordinator</dt>
								<dd>{program.coordinator?.user.name || 'Not assigned'}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-500">Calendar</dt>
								<dd>{program.calendar?.name || 'Not assigned'}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-500">Status</dt>
								<dd>{program.status}</dd>
							</div>
						</dl>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Statistics</CardTitle>
					</CardHeader>
					<CardContent>
						<dl className="space-y-2">
							<div>
								<dt className="text-sm font-medium text-gray-500">Total Class Groups</dt>
								<dd className="text-2xl font-bold">{classGroups?.length || 0}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-500">Total Classes</dt>
								<dd className="text-2xl font-bold">
									{classGroups?.reduce((acc, group) => acc + group.classes.length, 0) || 0}
								</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-500">Total Students</dt>
								<dd className="text-2xl font-bold">
									{studentsByGroup.reduce((acc, group) => acc + group.students, 0)}
								</dd>
							</div>
						</dl>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Assessment System</CardTitle>
					</CardHeader>
					<CardContent>
						{program?.assessmentSystem ? (
							<dl className="space-y-4">
								<div>
									<dt className="text-sm font-medium text-gray-500">Type</dt>
									<dd>{program?.assessmentSystem?.type?.replace('_', ' ')}</dd>
								</div>

								{program?.assessmentSystem?.type === AssessmentSystemType.MARKING_SCHEME && program?.assessmentSystem?.markingSchemes?.[0] && (
									<>
										<div>
											<dt className="text-sm font-medium text-gray-500">Marking Scheme</dt>
											<dd className="mt-1">
												<div className="space-y-1">
													<p>Maximum Marks: {program?.assessmentSystem?.markingSchemes?.[0]?.maxMarks}</p>
													<p>Passing Marks: {program?.assessmentSystem?.markingSchemes?.[0]?.passingMarks}</p>
												</div>
											</dd>
										</div>
										<div>
											<dt className="text-sm font-medium text-gray-500">Grading Scale</dt>
											<dd className="mt-2">
												<div className="grid grid-cols-2 gap-2">
													{program?.assessmentSystem?.markingSchemes?.[0]?.gradingScale?.map((grade: {
														grade: string;
														minPercentage: number;
														maxPercentage: number;
													}) => (
														<div key={grade.grade} className="bg-secondary p-2 rounded text-sm">
															<span className="font-medium">{grade.grade}:</span> {grade.minPercentage}% - {grade.maxPercentage}%
														</div>
													))}
												</div>
											</dd>
										</div>
									</>
								)}

{program?.assessmentSystem?.type === AssessmentSystemType.RUBRIC && program?.assessmentSystem?.rubrics?.[0] && (
									<>
										<div>
											<dt className="text-sm font-medium text-gray-500">Rubric Name</dt>
											<dd>{program?.assessmentSystem?.rubrics?.[0]?.name}</dd>
										</div>
										<div>
											<dt className="text-sm font-medium text-gray-500">Criteria</dt>
											<dd className="mt-2">
												<div className="space-y-3">
													{program?.assessmentSystem?.rubrics?.[0]?.criteria?.map((criterion: { name: string; description?: string; levels: Array<{ name: string; points: number }> }) => (
														<div key={criterion.name} className="bg-secondary p-3 rounded">
															<h4 className="font-medium">{criterion.name}</h4>
															{criterion.description && (
																<p className="text-sm text-gray-600 mt-1">{criterion.description}</p>
															)}
															<div className="grid grid-cols-2 gap-2 mt-2">
																{criterion.levels.map((level: { name: string; points: number }) => (
																	<div key={level.name} className="bg-background p-2 rounded text-sm">
																		<div className="font-medium">{level.name}</div>
																		<div>Points: {level.points}</div>
																	</div>
																))}
															</div>
														</div>
													))}
												</div>
											</dd>
										</div>
									</>
								)}
							</dl>
						) : (
							<p className="text-gray-500">No assessment system configured</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Students by Class Group</CardTitle>
					</CardHeader>
					<CardContent className="h-[200px]">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={studentsByGroup}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="name" />
								<YAxis />
								<Tooltip />
								<Bar dataKey="students" fill="#8884d8" />
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			</div>

			<Tabs defaultValue="classGroups">
				<TabsList>
					<TabsTrigger value="classGroups">Class Groups</TabsTrigger>
					<TabsTrigger value="activities">Recent Activities</TabsTrigger>
					<TabsTrigger value="assessment">Assessment Details</TabsTrigger>
				</TabsList>
				<TabsContent value="classGroups">
					<Card>
						<CardHeader>
							<CardTitle>Class Groups</CardTitle>
						</CardHeader>
						<CardContent>
							{classGroups && <DataTable 
								columns={columns} 
								data={classGroups.map(group => ({
									id: group.id,
									name: group.name,
									program: {
										id: group.program.id,
										name: group.program.name
									},
									subjects: group.subjects,
									status: group.status === "ARCHIVED" ? "INACTIVE" : group.status,
									classes: group.classes,
									description: null
								} satisfies ClassGroup))} 
							/>}
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="activities">
					<Card>
						<CardHeader>
							<CardTitle>Recent Activities</CardTitle>
						</CardHeader>
						<CardContent>
							<p>No recent activities</p>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="assessment">
					<Card>
						<CardHeader>
							<CardTitle>Assessment Configuration</CardTitle>
						</CardHeader>
						<CardContent>
							{program?.assessmentSystem ? (
								<div className="space-y-6">
									<div>
										<h3 className="text-lg font-medium">Assessment Type: {program?.assessmentSystem?.type?.replace('_', ' ')}</h3>
										{program?.assessmentSystem?.type === AssessmentSystemType.MARKING_SCHEME && (
											<div className="mt-4">
												<h4 className="font-medium">Performance Metrics</h4>
												<div className="mt-2">
													<ResponsiveContainer width="100%" height={300}>
														<BarChart data={program?.assessmentSystem?.markingSchemes?.[0]?.gradingScale || []}>
															<CartesianGrid strokeDasharray="3 3" />
															<XAxis dataKey="grade" />
															<YAxis />
															<Tooltip />
															<Bar dataKey="maxPercentage" fill="#8884d8" name="Maximum %" />
															<Bar dataKey="minPercentage" fill="#82ca9d" name="Minimum %" />
														</BarChart>
													</ResponsiveContainer>
												</div>
											</div>
										)}
									</div>
								</div>
							) : (
								<p>No assessment system configured for this program</p>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}