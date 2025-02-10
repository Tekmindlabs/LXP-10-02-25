import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { 
	ActivityType, 
	ActivityMode, 
	ActivityStatus,
	ActivityGradingType,
	ActivityViewType,
	ActivityResourceType,
	ActivitySubmissionStatus,
	ActivityConfiguration,
	ActivityResource
} from "@/types/class-activity";
import { Prisma } from "@prisma/client";

const configurationSchema = z.object({
	activityMode: z.nativeEnum(ActivityMode),
	isGraded: z.boolean(),
	totalMarks: z.number().min(1),
	passingMarks: z.number().min(1),
	gradingType: z.nativeEnum(ActivityGradingType),
	availabilityDate: z.date(),
	deadline: z.date(),
	instructions: z.string().optional(),
	timeLimit: z.number().optional(),
	attempts: z.number().optional(),
	viewType: z.nativeEnum(ActivityViewType),
	autoGradingConfig: z.object({
		scorePerQuestion: z.number(),
		penaltyPerWrongAnswer: z.number(),
		allowPartialCredit: z.boolean()
	}).optional()
});


const resourceSchema = z.object({
	title: z.string(),
	type: z.nativeEnum(ActivityResourceType),
	url: z.string(),
	fileInfo: z.object({
		size: z.number(),
		createdAt: z.date(),
		updatedAt: z.date(),
		mimeType: z.string(),
		publicUrl: z.string()
	}).optional()
});



export const classActivityRouter = createTRPCRouter({
	create: protectedProcedure
		.input(z.object({
			title: z.string().min(1),
			description: z.string().optional(),
			type: z.nativeEnum(ActivityType),
			classId: z.string().optional(),
			subjectId: z.string(),
			subjectIds: z.array(z.string()).optional(),
			classGroupId: z.string().optional(),
			calendar: z.object({
				inheritSettings: z.boolean(),
				id: z.string()
			}).optional(),
			configuration: configurationSchema,
			resources: z.array(resourceSchema).optional()
		}))
		.mutation(async ({ ctx, input }) => {
			const { resources, configuration, calendar, subjectIds, ...activityData } = input;

			const configJson = {
				...configuration,
				availabilityDate: configuration.availabilityDate.toISOString(),
				deadline: configuration.deadline.toISOString(),
			};

			const resourcesData = resources?.map(resource => ({
				title: resource.title,
				type: resource.type,
				url: resource.url,
				fileInfo: resource.fileInfo ? {
					...resource.fileInfo,
					createdAt: resource.fileInfo.createdAt.toISOString(),
					updatedAt: resource.fileInfo.updatedAt.toISOString(),
				} : undefined
			}));

			// Handle calendar inheritance
			let calendarId: string | undefined;
			if (calendar && activityData.classGroupId) {
				const classGroup = await ctx.prisma.classGroup.findUnique({
					where: { id: activityData.classGroupId },
					include: { program: { include: { calendar: true } } }
				});

				if (calendar.inheritSettings && classGroup?.program?.calendar) {
					calendarId = classGroup.program.calendar.id;
				} else {
					calendarId = calendar.id;
				}
			}

			return ctx.prisma.classActivity.create({
				data: {
					...activityData,
					status: ActivityStatus.PUBLISHED,
					configuration: configJson as Prisma.JsonObject,
					resources: resourcesData ? { create: resourcesData } : undefined,
					...(calendarId && { calendarId }),
					subjects: {
						connect: [...(subjectIds || []), input.subjectId].map(id => ({ id }))
					}
				},
				include: {
					class: { select: { name: true } },
					classGroup: { select: { name: true } },
					subject: { select: { name: true } },
					subjects: { select: { id: true, name: true } }
				}
			});
		}),

	getAll: protectedProcedure
		.input(z.object({
			classId: z.string().optional(),
			search: z.string().optional(),
			type: z.nativeEnum(ActivityType).optional(),
			classGroupId: z.string().optional()
		}))
		.query(async ({ ctx, input }) => {
			  const where: Prisma.ClassActivityWhereInput = {
				...(input.classId && { classId: input.classId }),
				...(input.type && { type: input.type }),
				...(input.classGroupId && { classGroupId: input.classGroupId }),
				...(input.search && {
					OR: [
						{ title: { contains: input.search, mode: 'insensitive' } },
						{ description: { contains: input.search, mode: 'insensitive' } },
					],
				}),
			};

			const activities = await ctx.prisma.classActivity.findMany({
				where,
				include: {
					class: { select: { name: true } },
					classGroup: { select: { name: true } },
					subject: { select: { name: true } },
					submissions: {
						select: {
							id: true,
							status: true,
							submittedAt: true,
							studentId: true,
							obtainedMarks: true,
							totalMarks: true,
							feedback: true,
							student: { select: { id: true, name: true } }
						}
					}
				},
				orderBy: { createdAt: 'desc' }
			});


			return activities.map(activity => ({
				...activity,
				configuration: activity.configuration as unknown as ActivityConfiguration,
				resources: [] // Default to empty array since resources are stored as JSON
			}));
		}),



	getById: protectedProcedure
		.input(z.string())
		.query(async ({ ctx, input }) => {
			try {
				const activity = await ctx.prisma.classActivity.findUnique({
					where: { id: input },
					include: {
						class: {
							select: {
								name: true
							}
						},
						subject: {
							select: {
								name: true,
								id: true
							}
						},
						subjects: { select: { id: true, name: true } },
						classGroup: {
							select: {
								name: true,
								calendar: true
							}
						},
						submissions: {
							select: {
								id: true,
								status: true,
								submittedAt: true,
								studentId: true,
								obtainedMarks: true,
								totalMarks: true,
								feedback: true,
								student: {
									select: {
										id: true,
										name: true
									}
								}
							}
						}
					}
				});

				if (!activity) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Activity not found',
					});
				}

				const config = activity.configuration as unknown as ActivityConfiguration;
				const resources = activity.resources as unknown as ActivityResource[] || [];

				return {
					...activity,
					configuration: config,
					resources
				};
			} catch (error) {
				if (error instanceof TRPCError) {
					throw error;
				}
				console.error('Error in getById query:', error);
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch activity details. Please try again.',
					cause: error
				});
			}
		}),


	update: protectedProcedure
		.input(z.object({
			id: z.string(),
			title: z.string(),
			description: z.string().optional(),
			type: z.nativeEnum(ActivityType),
			classId: z.string(),
			subjectId: z.string(),
			subjectIds: z.array(z.string()).optional(),
			calendar: z.object({
				inheritSettings: z.boolean(),
				id: z.string()
			}).optional(),
			configuration: configurationSchema,
			resources: z.array(resourceSchema).optional()
		}))
		.mutation(async ({ ctx, input }) => {
			const { id, calendar, subjectIds, resources, ...data } = input;

			// Handle calendar inheritance
			let calendarId: string | undefined;
			if (calendar && data.classGroupId) {
				const classGroup = await ctx.prisma.classGroup.findUnique({
					where: { id: data.classGroupId },
					include: { program: { include: { calendar: true } } }
				});

				if (calendar.inheritSettings && classGroup?.program?.calendar) {
					calendarId = classGroup.program.calendar.id;
				} else {
					calendarId = calendar.id;
				}
			}

			return ctx.prisma.classActivity.update({
				where: { id },
				data: {
					...data,
					...(calendarId && { calendarId }),
					subjects: {
						set: [...(subjectIds || []), input.subjectId].map(id => ({ id }))
					},
					resources: resources ? {
						deleteMany: {},
						create: resources
					} : undefined
				},
				include: {
					class: { select: { name: true } },
					classGroup: { select: { name: true } },
					subject: { select: { name: true } },
					subjects: { select: { id: true, name: true } },
					resources: true
				}
			});
		}),

	delete: protectedProcedure
		.input(z.string())
		.mutation(async ({ ctx, input }) => {
			return ctx.prisma.classActivity.delete({
				where: { id: input }
			});
		}),

	submitActivity: protectedProcedure
		.input(z.object({
			activityId: z.string(),
			studentId: z.string(),
			content: z.any(),
			status: z.nativeEnum(ActivitySubmissionStatus)
		}))
		.mutation(async ({ ctx, input }) => {
			const activity = await ctx.prisma.classActivity.findUnique({
				where: { id: input.activityId }
			});

			if (!activity) {

				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Activity or configuration not found',
				});
			}

			const config = activity.configuration as unknown as ActivityConfiguration;

			return ctx.prisma.activitySubmission.create({
				data: {
					activityId: input.activityId,
					studentId: input.studentId,
					status: input.status,
					content: input.content,
					submittedAt: new Date(),
					totalMarks: config.totalMarks,
					obtainedMarks: 0,
					isPassing: false,
					gradingType: config.gradingType
				}
			});
		}),

	gradeSubmission: protectedProcedure
		.input(z.object({
			submissionId: z.string(),
			obtainedMarks: z.number(),
			feedback: z.string().optional()
		}))
		.mutation(async ({ ctx, input }) => {
			const submission = await ctx.prisma.activitySubmission.findUnique({
				where: { id: input.submissionId },
				include: {
					activity: true
				}
			});

			if (!submission) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Submission not found',
				});
			}

			const config = submission.activity.configuration as unknown as ActivityConfiguration;
			const isPassing = input.obtainedMarks >= config.passingMarks;


			return ctx.prisma.activitySubmission.update({
				where: { id: input.submissionId },
				data: {
					obtainedMarks: input.obtainedMarks,
					feedback: input.feedback,
					isPassing,
					status: ActivitySubmissionStatus.GRADED,
					gradedAt: new Date(),
					gradedBy: ctx.session.user.id
				}
			});
		})
});