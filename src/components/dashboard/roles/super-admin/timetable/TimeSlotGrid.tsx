import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TimeSlotGridProps {
	children: ReactNode;
	startTime: string;
	endTime: string;
	isBreak?: boolean;
	hasConflict?: boolean;
	className?: string;
}

export function TimeSlotGrid({ 
	children, 
	startTime, 
	endTime, 
	isBreak = false,
	hasConflict = false,
	className 
}: TimeSlotGridProps) {
	return (
		<div
			className={cn(
				"relative min-h-[60px] border-l p-2",
				isBreak && "bg-secondary/5",
				hasConflict && "border-destructive/50 bg-destructive/5",
				"group hover:border-l-primary transition-colors",
				className
			)}
		>
			<div className="absolute -left-[1px] top-0 h-full w-[2px] bg-transparent group-hover:bg-primary transition-colors" />
			<div className="text-xs text-muted-foreground absolute top-1 right-2">
				{startTime} - {endTime}
			</div>
			<div className="pt-6">
				{children}
			</div>
		</div>
	);
}