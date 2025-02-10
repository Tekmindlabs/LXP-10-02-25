import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScheduleConflict } from '@/types/timetable';

interface ScheduleConflictIndicatorProps {
	conflicts: ScheduleConflict[];
	showDetails?: boolean;
}

export function ScheduleConflictIndicator({ conflicts, showDetails = false }: ScheduleConflictIndicatorProps) {
	if (conflicts.length === 0) return null;

	const conflictsByType = conflicts.reduce((acc, conflict) => {
		acc[conflict.type] = (acc[conflict.type] || 0) + 1;
		return acc;
	}, {} as Record<string, number>);

	return (
		<Alert variant="destructive" className="mb-4">
			<AlertCircle className="h-4 w-4" />
			<AlertDescription>
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-4 w-4" />
						<span className="font-medium">
							{conflicts.length} scheduling {conflicts.length === 1 ? 'conflict' : 'conflicts'} detected
						</span>
					</div>
					{showDetails && (
						<ul className="list-disc list-inside text-sm mt-2">
							{Object.entries(conflictsByType).map(([type, count]) => (
								<li key={type}>
									{count} {type.toLowerCase()} {count === 1 ? 'conflict' : 'conflicts'}
								</li>
							))}
						</ul>
					)}
				</div>
			</AlertDescription>
		</Alert>
	);
}