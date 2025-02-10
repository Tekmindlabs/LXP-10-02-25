'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgramForm } from "@/components/dashboard/roles/super-admin/program/ProgramForm";
import { api } from "@/utils/api";
import { useRouter, useParams } from "next/navigation";

export default function EditProgramPage() {
	const router = useRouter();
	const params = useParams();
	const programId = typeof params?.id === 'string' ? params.id : '';
	
	const { data: program } = api.program.getById.useQuery(programId);
	const { data: coordinators } = api.program.getAvailableCoordinators.useQuery();

	if (!program) {
		return <div>Loading...</div>;
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold tracking-tight">Edit Program</h2>
				<Button variant="outline" onClick={() => router.back()}>Back</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Program Details</CardTitle>
				</CardHeader>
				<CardContent>
					<ProgramForm
						coordinators={coordinators || []}
						selectedProgram={program}
						onSuccess={() => router.push('/dashboard/super-admin/program')}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
