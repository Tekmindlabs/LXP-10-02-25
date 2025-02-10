import { BreakTime } from '@/types/timetable';
import { Card } from '@/components/ui/card';
import { Clock } from 'lucide-react';

const getDurationInMinutes = (start: string, end: string): number => {
	const [startHour, startMinute] = start.split(':').map(Number);
	const [endHour, endMinute] = end.split(':').map(Number);
	return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
};

interface BreakTimeDisplayProps {
	breakTime: BreakTime;
	compact?: boolean;
}

export function BreakTimeDisplay({ breakTime, compact = false }: BreakTimeDisplayProps) {
	const icon = breakTime.type === 'LUNCH_BREAK' ? '🍽️' : '☕';
	const label = breakTime.type === 'LUNCH_BREAK' ? 'Lunch Break' : 'Break';

	if (compact) {
		return (
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<span>{icon}</span>
				<span>{breakTime.startTime} - {breakTime.endTime}</span>
			</div>
		);
	}

	return (
		<Card className="p-3 bg-secondary/10 hover:bg-secondary/20 transition-colors border-l-4 border-l-secondary shadow-sm">
			<div className="flex justify-between items-start">
				<div className="flex items-center gap-2">
					<span className="text-lg">{icon}</span>
					<div>
						<div className="font-medium">{label}</div>
						<div className="flex items-center gap-1 text-xs text-muted-foreground">
							<Clock className="h-3 w-3" />
							<span>{breakTime.startTime} - {breakTime.endTime}</span>
						</div>
					</div>
				</div>
				<div className="text-xs bg-secondary/20 px-2 py-1 rounded-full">
					{getDurationInMinutes(breakTime.startTime, breakTime.endTime)} min
				</div>

			</div>
		</Card>
	);
}