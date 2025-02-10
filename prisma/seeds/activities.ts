import { PrismaClient, Prisma } from '@prisma/client';
import { Class, Subject, ClassGroup } from '@prisma/client';

const prisma = new PrismaClient();

interface ActivityParams {
	classes: Class[];
	subjects: Subject[];
	classGroups: ClassGroup[];
}

interface ActivityInput {
	title: string;
	description: string | null;
	type: string;
	status: string;
	deadline: Date | null;
	classId?: string | null;
	classGroupId?: string | null;
	subjectId: string;
	gradingCriteria?: string | null;
	configuration: Prisma.InputJsonValue;
	resources?: {
		create: {
			title: string;
			type: string;
			url: string;
		}[];
	};
}

export async function seedActivities(prisma: PrismaClient, params?: ActivityParams) {
	if (params) {
		return seedActivitiesWithParams(prisma, params);
	}
	
	try {
		// First ensure we have required related data
		const subject = await prisma.subject.findFirst();
		const classGroup = await prisma.classGroup.findFirst();
		const class_ = await prisma.class.findFirst();

		if (!subject || !classGroup || !class_) {
			console.log('Required related data not found. Please seed subjects, class groups, and classes first.');
			return;
		}

		const activities = [
			{
				title: 'Mathematics Quiz 1',
				description: 'Basic arithmetic operations quiz',
				type: 'QUIZ_MULTIPLE_CHOICE',
				status: 'PUBLISHED',
				classId: class_.id,
				subjectId: subject.id,
				classGroupId: classGroup.id,
				deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
				configuration: {
					timeLimit: 30,
					passingMarks: 60,
					totalMarks: 100,
					questions: [
						{
							question: 'What is 2 + 2?',
							options: ['3', '4', '5', '6'],
							correctAnswer: '4',
							marks: 10
						}
					],
					gradingType: 'AUTOMATIC'
				},
				resources: {
					create: [
						{
							title: 'Math Study Guide',
							type: 'DOCUMENT',
							url: 'https://example.com/math-guide.pdf'
						}
					]
				}
			}
		];

		for (const activity of activities) {
			await prisma.classActivity.create({
				data: activity
			});
		}

		console.log('Activities seeded successfully');
	} catch (error) {
		console.error('Error seeding activities:', error);
		throw error;
	}
}

async function seedActivitiesWithParams(prisma: PrismaClient, params: ActivityParams) {
	console.log('Creating demo class activities...');

	const classNames = ['Grade 1-A', 'Grade 7-A', 'Grade 10-A'];
	const createdActivities = [];

	for (const className of classNames) {
		const class_ = await prisma.class.findFirst({
			where: { name: className }
		});

		if (!class_) continue;

		const activities: ActivityInput[] = [
			{
				title: `Math Quiz - ${className}`,
				description: 'Multiple choice math quiz',
				type: 'QUIZ_MULTIPLE_CHOICE',
				status: 'PUBLISHED',
				deadline: new Date('2024-09-15'),
				classGroupId: class_.classGroupId,
				subjectId: params.subjects[0]?.id ?? '',
				gradingCriteria: 'Automatic grading based on correct answers',
				configuration: {
					totalMarks: 20,
					passingMarks: 12,
					questions: [
						{
							question: 'What is 2 + 2?',
							options: ['3', '4', '5', '6'],
							correctAnswer: '4',
							marks: 10
						}
					],
					timeLimit: 30,
					gradingType: 'AUTOMATIC'
				}
			}
		];

		for (const activity of activities) {
			const created = await prisma.classActivity.upsert({
				where: {
					id: `${activity.title}-${class_.id}`
				},
				update: {
					...activity,
					classId: class_.id
				},
				create: {
					...activity,
					classId: class_.id,
					resources: {
						create: [
							{
								title: `${activity.title} Instructions`,
								type: 'DOCUMENT',
								url: `https://example.com/activities/${activity.title}/instructions.pdf`
							}
						]
					}
				}
			});
			createdActivities.push(created);
		}
	}

	return createdActivities;
}

// Execute if this file is run directly
if (require.main === module) {
	seedActivities(prisma)
		.then(() => console.log('Activities seeding completed'))
		.catch((e) => {
			console.error(e);
			process.exit(1);
		});
}



