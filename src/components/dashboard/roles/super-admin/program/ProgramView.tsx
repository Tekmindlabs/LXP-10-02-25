'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/utils/api";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AssessmentSystemType, Program } from "@/types/assessment";

type ProgramResponse = Program & {
	assessmentSystem?: {
		type: AssessmentSystemType;
	};
	termStructures?: Array<{
		id: string;
		name: string;
		startDate: Date;
		endDate: Date;
		academicTerms: Array<{
			name: string;
			startDate: Date;
			endDate: Date;
		}>;
	}>;
};

interface ProgramViewProps {
	programId: string;
	onEdit: (id: string) => void;
}

export const ProgramView = ({ programId, onEdit }: ProgramViewProps) => {
	const router = useRouter();
	const { data: program, isLoading } = api.program.getById.useQuery(programId) as { data: ProgramResponse | undefined, isLoading: boolean };


	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (!program) {
		return <div>Program not found</div>;
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">{program.name}</h2>
				<div className="space-x-2">
					<Button variant="outline" onClick={() => onEdit(programId)}>
						Edit
					</Button>
					<Button variant="outline" onClick={() => router.back()}>
						Back
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Overview</CardTitle>
					</CardHeader>
					<CardContent>
						<dl className="space-y-2">
							<div>
								<dt className="font-medium">Description</dt>
								<dd>{program.description || 'No description'}</dd>
							</div>
							<div>
								<dt className="font-medium">Status</dt>
								<dd>{program.status}</dd>
							</div>
							<div>
								<dt className="font-medium">Calendar</dt>
								<dd>{program.calendar?.name || 'Not assigned'}</dd>
							</div>
							<div>
								<dt className="font-medium">Coordinator</dt>
								<dd>{program.coordinator?.user.name || 'Not assigned'}</dd>
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
								<dt className="font-medium">Total Class Groups</dt>
								<dd>{program.classGroups?.length || 0}</dd>
							</div>
							<div>
								<dt className="font-medium">Assessment System</dt>
								<dd>
									{program.assessmentSystem ? 
										(program.assessmentSystem.type as AssessmentSystemType).replace('_', ' ') 
										: 'Not configured'}
								</dd>
							</div>
							{program.assessmentSystem?.type === AssessmentSystemType.CGPA && program.termStructures && (
								<>
									<div>
										<dt className="font-medium">Term System</dt>
										<dd>{program.termSystem === 'SEMESTER' ? 'Semester Based' : program.termSystem === 'TERM' ? 'Term Based' : 'Quarter Based'}</dd>
									</div>
									<div>
										<dt className="font-medium">Terms</dt>
										<dd>
											<ul>
												{program.termStructures.map((termStructure) => (
													<li key={termStructure.id}>
														{termStructure.name}: {new Date(termStructure.startDate).toLocaleDateString()} - {new Date(termStructure.endDate).toLocaleDateString()}
														{termStructure.academicTerms.map((term: { name: string; startDate: Date; endDate: Date }) => (
															<div key={term.name} className="ml-4 text-sm">
																{term.name}
															</div>
														))}
													</li>
												))}
											</ul>
										</dd>
									</div>
								</>
							)}
						</dl>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

