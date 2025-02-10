'use client';

import { useParams } from "next/navigation";
import ClassroomView from "@/components/dashboard/roles/super-admin/classroom/ClassroomView";

export default function ClassroomPage() {
	const params = useParams();
	const classroomId = params.id as string;

	return (
		<div className="container mx-auto py-6">
			<ClassroomView classroomId={classroomId} />
		</div>
	);
}
