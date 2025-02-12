import { z } from "zod";
import { createTRPCRouter, permissionProtectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Permissions } from "@/utils/permissions";
import { ActivitySubmission, ClassActivity as PrismaClassActivity } from "@prisma/client";
import { GradeBookService } from "@/server/services/GradeBookService";
import { SubjectGradeManager } from "@/server/services/SubjectGradeManager";


type ActivityConfiguration = {
	totalMarks: number;
	passingMarks: number;
	gradingType: string;
};

interface ClassActivity extends PrismaClassActivity {
	submissions: ActivitySubmission[];
}


interface GradeData {
	obtainedMarks: number;
	totalMarks: number;
	feedback?: string | null;
	gradedBy: string;
	gradedAt: Date;
	status: string;
	content: any;
	isPassing: boolean;
	gradingType: string;
}

export const gradebookRouter = createTRPCRouter({
	getOverview: permissionProtectedProcedure(Permissions.GRADEBOOK_OVERVIEW)
		.input(z.object({ classId: z.string() }))
		.query(async ({ ctx, input }) => {
			try {
				const activities = await ctx.prisma.classActivity.findMany({
					where: { classId: input.classId },
					include: {
						submissions: {
							select: {
								obtainedMarks: true,
								totalMarks: true,
								student: {
									select: {
										id: true,
										name: true
									}
								}
							}
						}
					}
				}) as unknown as ClassActivity[];

				const totalStudents = await ctx.prisma.studentProfile.count({
					where: { classId: input.classId }
				});

				let totalGrades = 0;
				let highestGrade = 0;
				let lowestGrade = 100;
				const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };

				activities.forEach((activity: ClassActivity) => {
					activity.submissions.forEach((submission: ActivitySubmission) => {
						if (submission.obtainedMarks && submission.totalMarks) {
							const grade = (submission.obtainedMarks / submission.totalMarks) * 100;
							totalGrades += grade;
							highestGrade = Math.max(highestGrade, grade);
							lowestGrade = Math.min(lowestGrade, grade);

							if (grade >= 90) gradeDistribution.A++;
							else if (grade >= 80) gradeDistribution.B++;
							else if (grade >= 70) gradeDistribution.C++;
							else if (grade >= 60) gradeDistribution.D++;
							else gradeDistribution.F++;
						}
					});
				});

				const totalSubmissions = activities.reduce((acc: number, act: ClassActivity) => 
					acc + act.submissions.length, 0);
				const classAverage = totalSubmissions > 0 ? totalGrades / totalSubmissions : 0;

				return {
					classAverage,
					highestGrade,
					lowestGrade,
					distribution: gradeDistribution,
					totalStudents
				};
			} catch (error) {
				console.error('Error in getOverview query:', error);
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch grade overview',
					cause: error
				});
			}
		}),

	getGrades: permissionProtectedProcedure(Permissions.GRADEBOOK_VIEW)
		.input(z.object({ classId: z.string() }))
		.query(async ({ ctx, input }) => {
			try {
				const students = await ctx.prisma.studentProfile.findMany({
					where: { classId: input.classId },
					include: {
						user: {
							select: {
								id: true,
								name: true,
								submissions: {
									include: {
										activity: {
											select: {
												id: true,
												title: true
											}
										}
									}
								}
							}
						}
					}
				});

				const studentGrades = students.map((student) => {
					const grades = student.user.submissions.map((submission: ActivitySubmission & {
						activity: { id: string; title: string }
					}) => ({
						activityId: submission.activity.id,
						activityName: submission.activity.title,
						grade: submission.obtainedMarks ?? 0,
						totalPoints: submission.totalMarks ?? 0
					}));

					const totalPoints = grades.reduce((acc: number, grade: {
						grade: number;
						totalPoints: number;
					}) => acc + grade.grade, 0);
					const maxPoints = grades.reduce((acc: number, grade: {
						grade: number;
						totalPoints: number;
					}) => acc + grade.totalPoints, 0);
					const overallGrade = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;

					return {
						studentId: student.id,
						studentName: student.user.name ?? 'Unknown Student',
						overallGrade,
						activityGrades: grades
					};
				});

				return { studentGrades };
			} catch (error) {
				console.error('Error in getGrades query:', error);
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch student grades',
					cause: error
				});
			}
		}),

	gradeActivity: permissionProtectedProcedure(Permissions.GRADE_ACTIVITY)
		.input(z.object({
			activityId: z.string(),
			studentId: z.string(),
			obtainedMarks: z.number().min(0),
			feedback: z.string().optional(),
		}))
		.mutation(async ({ ctx, input }) => {
			try {
				const activity = await ctx.prisma.classActivity.findUnique({
					where: { id: input.activityId },
					include: {
						class: {
							include: {
								gradeBook: {
									include: {
										assessmentSystem: true
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

				const config = activity.configuration as ActivityConfiguration;
				if (input.obtainedMarks > config.totalMarks) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'Obtained marks cannot exceed total marks',
					});
				}

				const isPassing = input.obtainedMarks >= config.passingMarks;

				const submissionData: GradeData = {
					obtainedMarks: input.obtainedMarks,
					totalMarks: config.totalMarks,
					feedback: input.feedback,
					gradedBy: ctx.session.user.id,
					gradedAt: new Date(),
					status: 'GRADED',
					content: {},
					isPassing,
					gradingType: config.gradingType
				};

				const gradeBookService = new GradeBookService(ctx.prisma);



				// Update grade and recalculate
				const submission = await ctx.prisma.activitySubmission.upsert({
					where: {
						activityId_studentId: {
							activityId: input.activityId,
							studentId: input.studentId,
						}
					},
					update: submissionData,
					create: {
						activityId: input.activityId,
						studentId: input.studentId,
						...submissionData
					},
				});

				// Recalculate subject grades if needed
				if (activity.class?.gradeBook) {
					await gradeBookService.calculateSubjectGrade(
						activity.classId ?? '',
						activity.subjectId,
						activity.class?.gradeBook?.termStructureId ?? ''
					);
				}

				return submission;
			} catch (error) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to grade activity',
					cause: error
				});
			}
		}),

	getSubjectGrades: permissionProtectedProcedure(Permissions.GRADEBOOK_VIEW)
		.input(z.object({ 
			gradeBookId: z.string(),
			subjectId: z.string(),
			termId: z.string()
		}))
		.query(async ({ ctx, input }) => {
			try {
				const gradeBookService = new GradeBookService(ctx.prisma);



				const subjectGrade = await gradeBookService.calculateSubjectGrade(
					input.gradeBookId,
					input.subjectId,
					input.termId
				);

				return subjectGrade;
			} catch (error) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch subject grades',
					cause: error
				});
			}
		}),

	getTermGrades: permissionProtectedProcedure(Permissions.GRADEBOOK_VIEW)
		.input(z.object({ 
			gradeBookId: z.string(),
			termId: z.string(),
			studentId: z.string()
		}))
		.query(async ({ ctx, input }) => {
			try {
				const gradeBookService = new GradeBookService(ctx.prisma);


				const termGrade = await gradeBookService.calculateCumulativeGrade(
					input.gradeBookId,
					input.studentId,
					input.termId
				);

				return termGrade;
			} catch (error) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch term grades',
					cause: error
				});
			}
		}),

	getCumulativeGrades: permissionProtectedProcedure(Permissions.GRADEBOOK_VIEW)
		.input(z.object({ 
			gradeBookId: z.string(),
			studentId: z.string(),
			termId: z.string()
		}))
		.query(async ({ ctx, input }) => {
			try {
				const gradeBookService = new GradeBookService(ctx.prisma);


				const cumulativeGrade = await gradeBookService.calculateCumulativeGrade(
					input.gradeBookId,
					input.studentId,
					input.termId
				);

				return cumulativeGrade;
			} catch (error) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch cumulative grades',
					cause: error
				});
			}
		}),

	getAssessmentPeriodGrades: permissionProtectedProcedure(Permissions.GRADEBOOK_VIEW)
		.input(z.object({ 
			subjectId: z.string(),
			periodId: z.string(),
			studentId: z.string(),
			assessmentSystemId: z.string()
		}))
		.query(async ({ ctx, input }) => {
			try {
				const subjectGradeManager = new SubjectGradeManager(ctx.prisma);
				
				const subjectConfig = await ctx.prisma.subjectConfig.findUnique({
					where: { subjectId: input.subjectId }
				});

				if (!subjectConfig) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Subject configuration not found',
					});
				}

				const periodGrade = await subjectGradeManager.calculateAssessmentPeriodGrade(
					input.subjectId,
					input.periodId,
					input.studentId,
					input.assessmentSystemId,
					{
						subjectId: input.subjectId,
						weightageDistribution: subjectConfig.weightageDistribution as {
							assignments: number;
							quizzes: number;
							exams: number;
							projects: number;
						},
						passingCriteria: subjectConfig.passingCriteria as {
							minPercentage: number;
							requiredAssessments: string[];
							minAttendance?: number;
						},
						gradeScale: subjectConfig.gradeScale as {
							A: { min: number; max: number; points: number };
							B: { min: number; max: number; points: number };
							C: { min: number; max: number; points: number };
							D: { min: number; max: number; points: number };
							F: { min: number; max: number; points: number };
						} | undefined
					}
				);

				return periodGrade;
			} catch (error) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: 'Failed to fetch assessment period grades',
					cause: error
				});
			}
		})
});