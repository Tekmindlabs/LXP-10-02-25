import { useState } from 'react';
import { TermSystemType } from '@/types/program';
import { termConfigs } from '@/constants/program';

export const useTermSystem = (initialTermSystem?: any) => {
	const [termSystem, setTermSystem] = useState(initialTermSystem || {
		type: "SEMESTER" as TermSystemType,
		terms: termConfigs.SEMESTER.terms.map(term => ({
			name: term.name,
			startDate: new Date(),
			endDate: new Date(),
			type: "SEMESTER" as TermSystemType,
			assessmentPeriods: []
		}))
	});

	const handleTermSystemTypeChange = (type: TermSystemType) => {
		const config = termConfigs[type];
		setTermSystem({
			type,
			terms: config.terms.map(term => ({
				name: term.name,
				startDate: new Date(),
				endDate: new Date(),
				type,
				assessmentPeriods: []
			}))
		});
	};

	const handleAddTerm = (type: TermSystemType) => {
		const newTermNumber = termSystem.terms.length + 1;
		const newTerm = {
			name: `${type} ${newTermNumber}`,
			startDate: new Date(),
			endDate: new Date(),
			type: type,
			assessmentPeriods: []
		};

		setTermSystem({
			...termSystem,
			terms: [...termSystem.terms, newTerm]
		});
	};

	const handleRemoveTerm = (index: number) => {
		const newTerms = [...termSystem.terms];
		newTerms.splice(index, 1);
		setTermSystem({
			...termSystem,
			terms: newTerms
		});
	};

	const handleTermChange = (index: number, field: string, value: any) => {
		const newTerms = [...termSystem.terms];
		newTerms[index] = {
			...newTerms[index],
			[field]: value
		};
		setTermSystem({
			...termSystem,
			terms: newTerms
		});
	};

	return {
		termSystem,
		setTermSystem,
		handleTermSystemTypeChange,
		handleAddTerm,
		handleRemoveTerm,
		handleTermChange
	};
};