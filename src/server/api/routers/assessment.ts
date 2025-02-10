import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { AssessmentService } from "../../services/assessment-service";
import { AssessmentSystemType, AssessmentType, SubmissionStatus } from "../../../types/assessment";

export const assessmentRouter = createTRPCRouter({
	// Assessment System Routes
	createAssessmentSystem: protectedProcedure
		.input(z.object({
			name: z.string(),
			description: z.string().optional(),
			type: z.nativeEnum(AssessmentSystemType),
			programId: z.string()
		}))
		.mutation(async ({ ctx, input }) => {
			const service = new AssessmentService(ctx.prisma);
			return service.createAssessmentSystem(input);
		}),

	// Marking Scheme Routes
	createMarkingScheme: protectedProcedure
		.input(z.object({
			name: z.string(),
			maxMarks: z.number(),
			passingMarks: z.number(),
			assessmentSystemId: z.string(),
			gradingScale: z.array(z.object({
				grade: z.string(),
				minPercentage: z.number(),
				maxPercentage: z.number()
			}))
		}))
		.mutation(async ({ ctx, input }) => {
			const service = new AssessmentService(ctx.prisma);
			return service.createMarkingScheme(input);
		}),

	// Rubric Routes
	createRubric: protectedProcedure
		.input(z.object({
			name: z.string(),
			description: z.string().optional(),
			assessmentSystemId: z.string(),
			criteria: z.array(z.object({
				name: z.string(),
				description: z.string().optional(),
				levels: z.array(z.object({
					name: z.string(),
					description: z.string().optional(),
					points: z.number()
				}))
			}))
		}))
		.mutation(async ({ ctx, input }) => {
			const service = new AssessmentService(ctx.prisma);
			return service.createRubric(input);
		}),

	// Assessment Routes
	createAssessment: protectedProcedure
		.input(z.object({
			title: z.string(),
			description: z.string().optional(),
			type: z.nativeEnum(AssessmentType),
			totalPoints: z.number(),
			markingSchemeId: z.string().optional(),
			rubricId: z.string().optional()
		}))
		.mutation(async ({ ctx, input }) => {
			const service = new AssessmentService(ctx.prisma);
			return service.createAssessment(input);
		}),

	// Submission Routes
	submitAssessment: protectedProcedure
		.input(z.object({
			assessmentId: z.string(),
			studentId: z.string()
		}))
		.mutation(async ({ ctx, input }) => {
			const service = new AssessmentService(ctx.prisma);
			return service.submitAssessment({
				...input,
				status: SubmissionStatus.SUBMITTED
			});
		}),

	gradeWithMarkingScheme: protectedProcedure
		.input(z.object({
			submissionId: z.string(),
			marks: z.number()
		}))
		.mutation(async ({ ctx, input }) => {
			const service = new AssessmentService(ctx.prisma);
			return service.gradeSubmissionWithMarkingScheme(
				input.submissionId,
				input.marks
			);
		}),

	gradeWithRubric: protectedProcedure
		.input(z.object({
			submissionId: z.string(),
			criteriaScores: z.record(z.string(), z.number())
		}))
		.mutation(async ({ ctx, input }) => {
			const service = new AssessmentService(ctx.prisma);
			return service.gradeSubmissionWithRubric(
				input.submissionId,
				input.criteriaScores
			);
		})
});