'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/loading-spinner';

interface GradeBookProps {
	classId: string;
}

interface GradeBook {
	id: string;
	subjectRecords: Array<{
		id: string;
		subjectId: string;
		termGrades: Record<string, any>;
		assessmentPeriodGrades: Record<string, any>;
	}>;
	assessmentSystem: {
		id: string;
		name: string;
	};
}

export const GradeBookComponent: React.FC<GradeBookProps> = ({ classId }) => {
	const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchGradeBook();
	}, [classId]);

	const fetchGradeBook = async () => {
		try {
			const response = await fetch(`/api/gradebook/${classId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch gradebook');
			}
			const data = await response.json();
			setGradeBook(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const initializeGradeBook = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/gradebook/${classId}`, {
				method: 'POST',
			});
			if (!response.ok) {
				throw new Error('Failed to initialize gradebook');
			}
			await fetchGradeBook();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred');
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return <Spinner />;
	}

	if (error) {
		return (
			<Card className="p-4">
				<p className="text-red-500">{error}</p>
				<Button onClick={initializeGradeBook}>Initialize Gradebook</Button>
			</Card>
		);
	}

	if (!gradeBook) {
		return (
			<Card className="p-4">
				<p>No gradebook found for this class.</p>
				<Button onClick={initializeGradeBook}>Initialize Gradebook</Button>
			</Card>
		);
	}

	return (
		<Card className="p-4">
			<h2 className="text-2xl font-bold mb-4">Gradebook</h2>
			<div className="overflow-x-auto">
				<Table>
					<thead>
						<tr>
							<th>Subject</th>
							<th>Term Grades</th>
							<th>Assessment Period Grades</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{gradeBook.subjectRecords.map((record) => (
							<tr key={record.id}>
								<td>{record.subjectId}</td>
								<td>{JSON.stringify(record.termGrades)}</td>
								<td>{JSON.stringify(record.assessmentPeriodGrades)}</td>
								<td>
									<Button variant="outline" size="sm">
										Edit
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</Table>
			</div>
		</Card>
	);
};
