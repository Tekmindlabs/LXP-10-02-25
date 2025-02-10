'use client';

import { useParams } from "next/navigation";
import { redirect } from "next/navigation";

export default function ProgramLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const params = useParams();
	const role = typeof params?.role === 'string' ? params.role : '';

	// Only allow super-admin and coordinator roles to access program management
	if (!['super-admin', 'coordinator'].includes(role)) {
		redirect('/dashboard');
	}

	return (
		<div className="container mx-auto py-6">
			{children}
		</div>
	);
}
