'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GradeBookProps {
	classId: string;
}

interface SubjectGrade {
	termId: string;
	periodGrades: Record<string, AssessmentPeriodGrade>;
	finalGrade: number;
	totalMarks: number;
	percentage: number;
	isPassing: boolean;
	gradePoints: number;
}

interface AssessmentPeriodGrade {
	periodId: string;
	obtainedMarks: number;
	totalMarks: number;
	percentage: number;
	weight: number;
	isPassing: boolean;
}

interface GradeBook {
	id: string;
	subjectRecords: Array<{
		id: string;
		subjectId: string;
		subject: {
			name: string;
			code: string;
		};
		termGrades: Record<string, SubjectGrade>;
		assessmentPeriodGrades: Record<string, AssessmentPeriodGrade>;
	}>;
	assessmentSystem: {
		id: string;
		name: string;
		type: 'MARKING_SCHEME' | 'RUBRIC' | 'CGPA' | 'HYBRID';
	};
}

export const GradebookComponent: React.FC<GradeBookProps> = ({ classId }) => {
	const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTerm, setActiveTerm] = useState<string>();
	const [activeSubject, setActiveSubject] = useState<string>();

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
			// Set initial active term if available
			if (data.subjectRecords[0]?.termGrades) {
				setActiveTerm(Object.keys(data.subjectRecords[0].termGrades)[0]);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const formatGrade = (grade: number, type: string) => {
		switch (type) {
			case 'CGPA':
				return grade.toFixed(2);
			case 'MARKING_SCHEME':
			case 'RUBRIC':
				return `${grade.toFixed(1)}%`;
			default:
				return grade.toString();
		}
	};

	const renderGradeTable = () => {
		if (!gradeBook || !activeTerm) return null;

		return (
			<Table>
				<thead>
					<tr>
						<th>Subject</th>
						<th>Assessment Periods</th>
						<th>Final Grade</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{gradeBook.subjectRecords.map((record) => {
						const termGrade = record.termGrades[activeTerm];
						if (!termGrade) return null;

						return (
							<tr key={record.id}>
								<td>{record.subject.name}</td>
								<td>
									{Object.entries(termGrade.periodGrades).map(([periodId, grade]) => (
										<div key={periodId}>
											{formatGrade(grade.percentage, gradeBook.assessmentSystem.type)}
											{` (${grade.weight}%)`}
										</div>
									))}
								</td>
								<td>
									{formatGrade(termGrade.finalGrade, gradeBook.assessmentSystem.type)}
								</td>
								<td>
									<span className={termGrade.isPassing ? 'text-green-500' : 'text-red-500'}>
										{termGrade.isPassing ? 'Passed' : 'Failed'}
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</Table>
		);
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center h-32">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (error) {
		return (
			<Card className="p-4">
				<p className="text-red-500">{error}</p>
				<Button onClick={() => fetchGradeBook()}>Retry</Button>
			</Card>
		);
	}

	if (!gradeBook) {
		return (
			<Card className="p-4">
				<p>No gradebook found for this class.</p>
			</Card>
		);
	}

	return (
		<Card className="p-4">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-2xl font-bold">Gradebook</h2>
				<Select value={activeTerm} onValueChange={setActiveTerm}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Select Term" />
					</SelectTrigger>
					<SelectContent>
						{Object.keys(gradeBook.subjectRecords[0]?.termGrades || {}).map((termId) => (
							<SelectItem key={termId} value={termId}>
								Term {termId}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="overflow-x-auto">
				{renderGradeTable()}
			</div>
		</Card>
	);
};
