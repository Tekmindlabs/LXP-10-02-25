"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/utils/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "@/components/dashboard/roles/super-admin/class-group/columns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssessmentSystemType } from "@/types/assessment";

interface ProgramViewProps {
	programId: string;
	onBack: () => void;
}

export function ProgramView({ programId, onBack }: ProgramViewProps) {
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
	);
	
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
	);

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

	const studentsByGroup = classGroups?.map(group => ({
		name: group.name,
		students: group.classes.reduce((acc, cls) => acc + cls.students.length, 0)
	})) || [];

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-3xl font-bold">{program.name}</h2>
				<button
					onClick={onBack}
					className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
				>
					Back to Programs
				</button>
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
						{program.assessmentSystem ? (
							<dl className="space-y-4">
								<div>
									<dt className="text-sm font-medium text-gray-500">Type</dt>
									<dd>{program.assessmentSystem.type.replace('_', ' ')}</dd>
								</div>

								{program.assessmentSystem.type === AssessmentSystemType.MARKING_SCHEME && program.assessmentSystem.markingScheme && (
									<>
										<div>
											<dt className="text-sm font-medium text-gray-500">Marking Scheme</dt>
											<dd className="mt-1">
												<div className="space-y-1">
													<p>Maximum Marks: {program.assessmentSystem.markingScheme.maxMarks}</p>
													<p>Passing Marks: {program.assessmentSystem.markingScheme.passingMarks}</p>
												</div>
											</dd>
										</div>
										<div>
											<dt className="text-sm font-medium text-gray-500">Grading Scale</dt>
											<dd className="mt-2">
												<div className="grid grid-cols-2 gap-2">
													{program.assessmentSystem.markingScheme.gradingScale.map((grade, index) => (
														<div key={index} className="bg-secondary p-2 rounded text-sm">
															<span className="font-medium">{grade.grade}:</span> {grade.minPercentage}% - {grade.maxPercentage}%
														</div>
													))}
												</div>
											</dd>
										</div>
									</>
								)}

								{program.assessmentSystem.type === AssessmentSystemType.RUBRIC && program.assessmentSystem.rubric && (
									<>
										<div>
											<dt className="text-sm font-medium text-gray-500">Rubric Name</dt>
											<dd>{program.assessmentSystem.rubric.name}</dd>
										</div>
										<div>
											<dt className="text-sm font-medium text-gray-500">Criteria</dt>
											<dd className="mt-2">
												<div className="space-y-3">
													{program.assessmentSystem.rubric.criteria.map((criterion, index) => (
														<div key={index} className="bg-secondary p-3 rounded">
															<h4 className="font-medium">{criterion.name}</h4>
															{criterion.description && (
																<p className="text-sm text-gray-600 mt-1">{criterion.description}</p>
															)}
															<div className="grid grid-cols-2 gap-2 mt-2">
																{criterion.levels.map((level, levelIndex) => (
																	<div key={levelIndex} className="bg-background p-2 rounded text-sm">
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
							{classGroups && <DataTable columns={columns} data={classGroups} />}
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
							{program.assessmentSystem ? (
								<div className="space-y-6">
									<div>
										<h3 className="text-lg font-medium">Assessment Type: {program.assessmentSystem.type.replace('_', ' ')}</h3>
										{program.assessmentSystem.type === AssessmentSystemType.MARKING_SCHEME && (
											<div className="mt-4">
												<h4 className="font-medium">Performance Metrics</h4>
												<div className="mt-2">
													<ResponsiveContainer width="100%" height={300}>
														<BarChart data={program.assessmentSystem.markingScheme?.gradingScale || []}>
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