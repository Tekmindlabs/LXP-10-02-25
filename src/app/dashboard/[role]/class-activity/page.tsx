'use client';

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { ActivityType } from "@/types/class-activity";
import { use } from 'react';

interface Props {
	params: Promise<{
		role: string;
	}>;
}

type Activity = {
	id: string;
	title: string;
	type: ActivityType;
	status: string;
	deadline: Date | null;
	class: { name: string } | null;
	subject: { name: string };
};

function formatDate(date: Date | null): string {
	if (!date) return '-';
	return new Date(date).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export default function ClassActivityPage({ params }: Props) {
	const router = useRouter();
	const resolvedParams = use(params);
	const { data: activities, isLoading } = api.classActivity.getAll.useQuery({}, {
		select: (data) => data.map(activity => ({
			id: activity.id,
			title: activity.title,
			type: activity.type,
			status: activity.status,
			deadline: activity.deadline,
			class: activity.class,
			subject: activity.subject
		}))
	});

	const columns: ColumnDef<Activity, unknown>[] = [
		{
			id: "title",
			accessorFn: (row) => row.title,
			header: "Title",
		},
		{
			id: "type",
			accessorFn: (row) => row.type,
			header: "Type",
			cell: ({ row }) => row.original.type.replace(/_/g, ' '),
		},
		{
			id: "className",
			accessorFn: (row) => row.class?.name,
			header: "Class",
		},
		{
			id: "subjectName",
			accessorFn: (row) => row.subject.name,
			header: "Subject",
		},
		{
			id: "status",
			accessorFn: (row) => row.status,
			header: "Status",
		},
		{
			id: "deadline",
			accessorFn: (row) => row.deadline,
			header: "Deadline",
			cell: ({ row }) => formatDate(row.original.deadline),
		},
		{
			id: "actions",
			cell: ({ row }) => (
				<Button
					variant="outline"
					onClick={() => router.push(`/dashboard/${resolvedParams.role}/class-activity/${row.original.id}/edit`)}
				>
					Edit
				</Button>
			),
		},
	];

	return (
		<div className="container mx-auto py-8">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold">Class Activities</h1>
				<Button 
					onClick={() => router.push(`/dashboard/${resolvedParams.role}/class-activity/create`)}
				>
					Create Activity
				</Button>
			</div>

			<div className="bg-white rounded-lg shadow">
				{isLoading ? (
					<div className="p-8 text-center">Loading...</div>
				) : (
					<DataTable 
						columns={columns} 
						data={activities || []} 
					/>
				)}
			</div>
		</div>
	);
}