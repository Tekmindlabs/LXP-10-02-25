'use client';

import { Button } from "@/components/ui/button";
import { ProgramView } from "@/components/dashboard/roles/super-admin/program/ProgramView";
import { useRouter } from "next/navigation";

export default function ViewProgramPage({ params }: { params: { id: string } }) {
	const router = useRouter();

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-3xl font-bold tracking-tight">Program Details</h2>
				<Button variant="outline" onClick={() => router.back()}>Back</Button>
			</div>

			<ProgramView 
				programId={params.id}
				onEdit={(id) => router.push(`/dashboard/super-admin/program/${id}/edit`)}
			/>
		</div>
	);
}