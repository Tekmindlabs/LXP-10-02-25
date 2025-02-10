'use client';

import { AssessmentSystemType } from "@/types/assessment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, PlusCircle } from "lucide-react";
import { api } from "@/utils/api";
import { useRouter } from "next/navigation";
import { ProgramList } from "@/components/dashboard/roles/super-admin/program/ProgramList";

export default function ProgramPage() {

	const router = useRouter();
	
	const { 
		data: programData,
		isLoading: programsLoading,
		error: programsError
	} = api.program.getAll.useQuery({
		page: 1,
		pageSize: 10
	}, {
		retry: 1,
		refetchOnWindowFocus: false
	});

	if (programsError) {
		return (
			<Alert variant="destructive">
				<AlertDescription>
					{programsError.message}
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold tracking-tight">Program Management</h2>
				<Button onClick={() => router.push('/dashboard/super-admin/program/add')}>
					<PlusCircle className="mr-2 h-4 w-4" />
					Create Program
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Programs Overview</CardTitle>
				</CardHeader>
				<CardContent>
					{programsLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-8 w-8 animate-spin" />
						</div>
					) : (
						<>
							<ProgramList 
								programs={(programData?.programs || []).map(program => ({
									id: program.id,
									name: program.name,
									description: program.description,
									status: program.status.toString(),
									calendar: program.calendar ? { name: program.calendar.name } : null,
									coordinator: program.coordinator ? { user: { name: program.coordinator.user.name || null } } : null,
									classGroups: program.classGroups || [],
									assessmentSystem: program.assessmentSystem ? {
										type: program.assessmentSystem.type as AssessmentSystemType,
										markingSchemes: program.assessmentSystem.markingSchemes || [],
										rubrics: program.assessmentSystem.rubrics || []
									} : null
								}))}
								onSelect={(id) => router.push(`/dashboard/super-admin/program/${id}`)}
								onEdit={(id) => router.push(`/dashboard/super-admin/program/${id}/edit`)}
							/>

						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}


