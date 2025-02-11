import { Button } from "@/components/ui/button";

interface ProgramSubmissionProps {
	isSubmitting: boolean;
	isEditing: boolean;
	onSubmit: (e: React.FormEvent) => void;
	children?: React.ReactNode;
}

export const ProgramSubmission = ({ isSubmitting, isEditing, onSubmit, children }: ProgramSubmissionProps) => {
	return (
		<form onSubmit={onSubmit} className="space-y-4">
			{children}
			<Button type="submit" className="w-full" disabled={isSubmitting}>
				{isSubmitting ? 'Saving...' : isEditing ? "Update" : "Create"} Program
			</Button>
		</form>
	);
};