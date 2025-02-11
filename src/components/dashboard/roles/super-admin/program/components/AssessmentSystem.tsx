import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssessmentSystemType } from "@/types/assessment";
import { ProgramFormData } from "@/types/program";
import { defaultCGPAConfig, defaultRubric } from "@/constants/program";

interface AssessmentSystemProps {
	formData: ProgramFormData;
	onFormDataChange: (newData: Partial<ProgramFormData>) => void;
}

export const AssessmentSystem = ({ formData, onFormDataChange }: AssessmentSystemProps) => {
	const handleAssessmentTypeChange = (type: AssessmentSystemType) => {
		onFormDataChange({
			assessmentSystem: {
				type,
				...(type === AssessmentSystemType.MARKING_SCHEME ? {
					markingScheme: {
						maxMarks: 100,
						passingMarks: 40,
						gradingScale: [
							{ grade: 'A', minPercentage: 80, maxPercentage: 100 },
							{ grade: 'B', minPercentage: 70, maxPercentage: 79 },
							{ grade: 'C', minPercentage: 60, maxPercentage: 69 },
							{ grade: 'D', minPercentage: 50, maxPercentage: 59 },
							{ grade: 'E', minPercentage: 40, maxPercentage: 49 },
							{ grade: 'F', minPercentage: 0, maxPercentage: 39 }
						]
					}
				} : type === AssessmentSystemType.RUBRIC ? {
					rubric: defaultRubric
				} : type === AssessmentSystemType.CGPA ? {
					cgpaConfig: defaultCGPAConfig
				} : {})
			}
		});
	};

	const updateMarkingScheme = (field: string, value: any) => {
		onFormDataChange({
			assessmentSystem: {
				...formData.assessmentSystem,
				markingScheme: {
					...formData.assessmentSystem.markingScheme!,
					[field]: value
				}
			}
		});
	};

	const updateGradingScale = (index: number, field: string, value: any) => {
		const newScale = [...formData.assessmentSystem.markingScheme!.gradingScale];
		newScale[index] = { ...newScale[index], [field]: value };
		updateMarkingScheme('gradingScale', newScale);
	};

	return (
		<div className="space-y-4 border p-4 rounded-lg">
			<h3 className="text-lg font-semibold">Assessment System</h3>
			
			<div>
				<Label>Assessment Type</Label>
				<Select
					value={formData.assessmentSystem.type}
					onValueChange={handleAssessmentTypeChange}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder="Select Assessment Type" />
					</SelectTrigger>
					<SelectContent>
						{Object.values(AssessmentSystemType).map((type) => (
							<SelectItem key={type} value={type}>
								{type.replace('_', ' ')}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{formData.assessmentSystem.type === AssessmentSystemType.MARKING_SCHEME && (
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Maximum Marks</Label>
							<Input
								type="number"
								value={formData.assessmentSystem.markingScheme?.maxMarks}
								onChange={(e) => updateMarkingScheme('maxMarks', Number(e.target.value))}
							/>
						</div>
						<div>
							<Label>Passing Marks</Label>
							<Input
								type="number"
								value={formData.assessmentSystem.markingScheme?.passingMarks}
								onChange={(e) => updateMarkingScheme('passingMarks', Number(e.target.value))}
							/>
						</div>
					</div>

					<div>
						<Label>Grading Scale</Label>
						{formData.assessmentSystem.markingScheme?.gradingScale.map((grade, index) => (
							<div key={index} className="grid grid-cols-3 gap-2 mt-2">
								<Input
									placeholder="Grade"
									value={grade.grade}
									onChange={(e) => updateGradingScale(index, 'grade', e.target.value)}
								/>
								<Input
									type="number"
									placeholder="Min %"
									value={grade.minPercentage}
									onChange={(e) => updateGradingScale(index, 'minPercentage', Number(e.target.value))}
								/>
								<Input
									type="number"
									placeholder="Max %"
									value={grade.maxPercentage}
									onChange={(e) => updateGradingScale(index, 'maxPercentage', Number(e.target.value))}
								/>
							</div>
						))}
					</div>
				</div>
			)}

			{formData.assessmentSystem.type === AssessmentSystemType.RUBRIC && (
				<div className="space-y-4">
					<div>
						<Label>Rubric Name</Label>
						<Input
							value={formData.assessmentSystem.rubric?.name || ''}
							onChange={(e) => onFormDataChange({
								assessmentSystem: {
									...formData.assessmentSystem,
									rubric: {
										...formData.assessmentSystem.rubric!,
										name: e.target.value
									}
								}
							})}
						/>
					</div>

					<div>
						<Label>Criteria</Label>
						{formData.assessmentSystem.rubric?.criteria.map((criterion, index) => (
							<div key={index} className="space-y-2 mt-2 p-2 border rounded">
								<Input
									placeholder="Criterion Name"
									value={criterion.name}
									onChange={(e) => {
										const newCriteria = [...formData.assessmentSystem.rubric!.criteria];
										newCriteria[index] = { ...criterion, name: e.target.value };
										onFormDataChange({
											assessmentSystem: {
												...formData.assessmentSystem,
												rubric: {
													...formData.assessmentSystem.rubric!,
													criteria: newCriteria
												}
											}
										});
									}}
								/>
								
								<div className="space-y-2">
									{criterion.levels.map((level, levelIndex) => (
										<div key={levelIndex} className="grid grid-cols-2 gap-2">
											<Input
												placeholder="Level Name"
												value={level.name}
												onChange={(e) => {
													const newCriteria = [...formData.assessmentSystem.rubric!.criteria];
													newCriteria[index].levels[levelIndex] = {
														...level,
														name: e.target.value
													};
													onFormDataChange({
														assessmentSystem: {
															...formData.assessmentSystem,
															rubric: {
																...formData.assessmentSystem.rubric!,
																criteria: newCriteria
															}
														}
													});
												}}
											/>
											<Input
												type="number"
												placeholder="Points"
												value={level.points}
												onChange={(e) => {
													const newCriteria = [...formData.assessmentSystem.rubric!.criteria];
													newCriteria[index].levels[levelIndex] = {
														...level,
														points: Number(e.target.value)
													};
													onFormDataChange({
														assessmentSystem: {
															...formData.assessmentSystem,
															rubric: {
																...formData.assessmentSystem.rubric!,
																criteria: newCriteria
															}
														}
													});
												}}
											/>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{formData.assessmentSystem.type === AssessmentSystemType.CGPA && (
				<div className="space-y-4">
					<div>
						<Label>Grade Points Configuration</Label>
						{formData.assessmentSystem.cgpaConfig?.gradePoints.map((grade, index) => (
							<div key={index} className="grid grid-cols-4 gap-2 mt-2">
								<Input
									placeholder="Grade"
									value={grade.grade}
									onChange={(e) => {
										const newGradePoints = [...formData.assessmentSystem.cgpaConfig!.gradePoints];
										newGradePoints[index] = { ...grade, grade: e.target.value };
										onFormDataChange({
											assessmentSystem: {
												...formData.assessmentSystem,
												cgpaConfig: {
													...formData.assessmentSystem.cgpaConfig!,
													gradePoints: newGradePoints
												}
											}
										});
									}}
								/>
								<Input
									type="number"
									placeholder="Points"
									value={grade.points}
									onChange={(e) => {
										const newGradePoints = [...formData.assessmentSystem.cgpaConfig!.gradePoints];
										newGradePoints[index] = { ...grade, points: Number(e.target.value) };
										onFormDataChange({
											assessmentSystem: {
												...formData.assessmentSystem,
												cgpaConfig: {
													...formData.assessmentSystem.cgpaConfig!,
													gradePoints: newGradePoints
												}
											}
										});
									}}
								/>
								<Input
									type="number"
									placeholder="Min %"
									value={grade.minPercentage}
									onChange={(e) => {
										const newGradePoints = [...formData.assessmentSystem.cgpaConfig!.gradePoints];
										newGradePoints[index] = { ...grade, minPercentage: Number(e.target.value) };
										onFormDataChange({
											assessmentSystem: {
												...formData.assessmentSystem,
												cgpaConfig: {
													...formData.assessmentSystem.cgpaConfig!,
													gradePoints: newGradePoints
												}
											}
										});
									}}
								/>
								<Input
									type="number"
									placeholder="Max %"
									value={grade.maxPercentage}
									onChange={(e) => {
										const newGradePoints = [...formData.assessmentSystem.cgpaConfig!.gradePoints];
										newGradePoints[index] = { ...grade, maxPercentage: Number(e.target.value) };
										onFormDataChange({
											assessmentSystem: {
												...formData.assessmentSystem,
												cgpaConfig: {
													...formData.assessmentSystem.cgpaConfig!,
													gradePoints: newGradePoints
												}
											}
										});
									}}
								/>
							</div>
						))}
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							id="semesterWeightage"
							checked={formData.assessmentSystem.cgpaConfig?.semesterWeightage}
							onCheckedChange={(checked) => {
								onFormDataChange({
									assessmentSystem: {
										...formData.assessmentSystem,
										cgpaConfig: {
											...formData.assessmentSystem.cgpaConfig!,
											semesterWeightage: checked as boolean
										}
									}
								});
							}}
						/>
						<Label htmlFor="semesterWeightage">Apply semester weightage</Label>
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							id="includeBacklogs"
							checked={formData.assessmentSystem.cgpaConfig?.includeBacklogs}
							onCheckedChange={(checked) => {
								onFormDataChange({
									assessmentSystem: {
										...formData.assessmentSystem,
										cgpaConfig: {
											...formData.assessmentSystem.cgpaConfig!,
											includeBacklogs: checked as boolean
										}
									}
								});
							}}
						/>
						<Label htmlFor="includeBacklogs">Include backlogs in CGPA calculation</Label>
					</div>
				</div>
			)}
		</div>
	);
};