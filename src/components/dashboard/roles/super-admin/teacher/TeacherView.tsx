'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TeacherProfileView from "./TeacherProfileView";

interface TeacherViewProps {
	teacherId: string;
	isPage?: boolean;
	onClose?: () => void;
	onEdit?: () => void;
}

export const TeacherView = ({ teacherId, isPage = false, onClose, onEdit }: TeacherViewProps) => {
	const content = <TeacherProfileView teacherId={teacherId} />;

	if (isPage) {
		return content;
	}

	return (
		<Dialog open={true} onOpenChange={onClose}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Teacher Details</DialogTitle>
				</DialogHeader>
				{content}
			</DialogContent>
		</Dialog>
	);
};

