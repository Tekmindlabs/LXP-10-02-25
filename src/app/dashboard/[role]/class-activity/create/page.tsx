'use client';

import ClassActivityForm from "@/components/dashboard/roles/super-admin/class-activity/ClassActivityForm";
import { useRouter } from "next/navigation";
import { use } from 'react';

interface Props {
	params: Promise<{
		role: string;
	}>;
}

export default function CreateClassActivityPage({ params }: Props) {
	const router = useRouter();
	const resolvedParams = use(params);

	return (
		<div className="container mx-auto py-8">
			<ClassActivityForm 
				onClose={() => router.push(`/dashboard/${resolvedParams.role}/class-activity`)} 
			/>
		</div>
	);
}