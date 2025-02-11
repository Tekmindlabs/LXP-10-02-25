export const gradingConfig = {
	caching: {
		enabled: true,
		ttl: 3600, // 1 hour
		maxSize: 1000 // Maximum cache entries
	},
	validation: {
		maxGrade: 100,
		minGrade: 0,
		allowDecimals: true,
		decimalPlaces: 2
	},
	batch: {
		size: 100,
		retryAttempts: 3
	},
	assessment: {
		defaultPassingPercentage: 50,
		cgpa: {
			maxGPA: 4.0,
			minGPA: 0.0,
			defaultGradePoints: [
				{ grade: 'A', minPercentage: 90, maxPercentage: 100, points: 4.0 },
				{ grade: 'B', minPercentage: 80, maxPercentage: 89, points: 3.5 },
				{ grade: 'C', minPercentage: 70, maxPercentage: 79, points: 3.0 },
				{ grade: 'D', minPercentage: 60, maxPercentage: 69, points: 2.5 },
				{ grade: 'E', minPercentage: 50, maxPercentage: 59, points: 2.0 },
				{ grade: 'F', minPercentage: 0, maxPercentage: 49, points: 0.0 }
			]
		}
	}
};