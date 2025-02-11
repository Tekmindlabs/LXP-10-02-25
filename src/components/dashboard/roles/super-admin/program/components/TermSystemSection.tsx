import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { TermSystemType } from "@/types/program";

interface TermSystemSectionProps {
	termSystem: any;
	onTermSystemTypeChange: (type: TermSystemType) => void;
	onAddTerm: (type: TermSystemType) => void;
	onRemoveTerm: (index: number) => void;
	onTermChange: (index: number, field: string, value: any) => void;
}

export const TermSystemSection = ({
	termSystem,
	onTermSystemTypeChange,
	onAddTerm,
	onRemoveTerm,
	onTermChange
}: TermSystemSectionProps) => {
	return (
		<div className="space-y-4 border p-4 rounded-lg">
			<h3 className="text-lg font-semibold">Term System</h3>
			<div>
				<Label>System Type</Label>
				<Select
					value={termSystem.type}
					onValueChange={onTermSystemTypeChange}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select term system" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="SEMESTER">Semester Based</SelectItem>
						<SelectItem value="TERM">Term Based</SelectItem>
						<SelectItem value="QUARTER">Quarter Based</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				{termSystem.terms.map((term: any, index: number) => (
					<div key={index} className="space-y-2 border p-2 rounded">
						<div className="flex justify-between items-center">
							<h4 className="font-medium">{term.name}</h4>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onRemoveTerm(index)}
								className="text-red-500 hover:text-red-700"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<Label>Start Date</Label>
								<Input
									type="date"
									value={term.startDate.toISOString().split('T')[0]}
									onChange={(e) => onTermChange(index, 'startDate', new Date(e.target.value))}
								/>
							</div>
							<div>
								<Label>End Date</Label>
								<Input
									type="date"
									value={term.endDate.toISOString().split('T')[0]}
									onChange={(e) => onTermChange(index, 'endDate', new Date(e.target.value))}
								/>
							</div>
						</div>
					</div>
				))}
				
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="w-full mt-2"
					onClick={() => onAddTerm(termSystem.type)}
				>
					<Plus className="h-4 w-4 mr-2" />
					Add
				</Button>
			</div>
		</div>
	);
};