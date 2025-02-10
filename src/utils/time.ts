export function convert24To12Hour(time24: string): string {
	const [hours, minutes] = time24.split(':');
	const hour = parseInt(hours, 10);
	const period = hour >= 12 ? 'PM' : 'AM';
	const hour12 = hour % 12 || 12;
	return `${hour12.toString().padStart(2, '0')}:${minutes} ${period}`;
}

export function convert12To24Hour(time12: string): string {
	const [time, period] = time12.split(' ');
	const [hours, minutes] = time.split(':');
	let hour = parseInt(hours, 10);
	
	if (period === 'PM' && hour !== 12) {
		hour += 12;
	} else if (period === 'AM' && hour === 12) {
		hour = 0;
	}
	
	return `${hour.toString().padStart(2, '0')}:${minutes}`;
}

export function formatDisplayTime(time: string | Date): string {
	if (time instanceof Date) {
		return time.toLocaleTimeString('en-US', { 
			hour: '2-digit', 
			minute: '2-digit', 
			hour12: true 
		});
	}
	const [hours, minutes] = time.split(':');
	const date = new Date();
	date.setHours(parseInt(hours), parseInt(minutes));
	return date.toLocaleTimeString('en-US', { 
		hour: '2-digit', 
		minute: '2-digit', 
		hour12: true 
	});
}