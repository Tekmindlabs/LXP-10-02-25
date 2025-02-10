'use client';

import ClassActivityForm from "@/components/dashboard/roles/super-admin/class-activity/ClassActivityForm";
import { useRouter } from "next/navigation";
import { use } from 'react';

interface Props {
	params: Promise<{
		id: string;
		role: string;
	}>;
}

export default function EditClassActivityPage({ params }: Props) {
	const router = useRouter();
	const resolvedParams = use(params);

	return (
		<div>
			<ClassActivityForm 
				activityId={resolvedParams.id}
				onClose={() => router.push(`/dashboard/${resolvedParams.role}/class-activity`)} 
			/>
		</div>
	);
}