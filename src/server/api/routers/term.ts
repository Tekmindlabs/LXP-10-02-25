import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { Status } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { TermManagementService } from "../../services/TermManagementService";

const termTypeEnum = z.enum(['SEMESTER', 'TERM', 'QUARTER'] as const);


export const termRouter = createTRPCRouter({
	create: protectedProcedure
		.input(z.object({
			name: z.string(),
			calendarId: z.string(),
			startDate: z.date(),
			endDate: z.date(),
			status: z.nativeEnum(Status).default(Status.ACTIVE),
		}))
		.mutation(async ({ ctx, input }) => {
			const calendar = await ctx.prisma.calendar.findUnique({
				where: { id: input.calendarId }
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			if (input.startDate < calendar.startDate || input.endDate > calendar.endDate) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Term dates must be within calendar period",
				});
			}

			return ctx.prisma.term.create({
				data: input,
			});
		}),

	update: protectedProcedure
		.input(z.object({
			id: z.string(),
			name: z.string().optional(),
			startDate: z.date().optional(),
			endDate: z.date().optional(),
			status: z.nativeEnum(Status).optional(),
		}))
		.mutation(async ({ ctx, input }) => {
			const term = await ctx.prisma.term.findUnique({
				where: { id: input.id },
				include: { calendar: true }
			});

			if (!term) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Term not found",
				});
			}

			if (input.startDate && input.startDate < term.calendar.startDate || 
					input.endDate && input.endDate > term.calendar.endDate) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Term dates must be within calendar period",
				});
			}

			return ctx.prisma.term.update({
				where: { id: input.id },
				data: {
					name: input.name,
					startDate: input.startDate,
					endDate: input.endDate,
					status: input.status,
				},
			});
		}),

	getByCalendar: protectedProcedure
		.input(z.string())
		.query(async ({ ctx, input }) => {
			return ctx.prisma.term.findMany({
				where: { calendarId: input },
				include: {
					gradingPeriods: true,
					weeks: true,
				},
				orderBy: { startDate: 'asc' },
			});
		}),

	delete: protectedProcedure
		.input(z.string())
		.mutation(async ({ ctx, input }) => {
			return ctx.prisma.term.delete({
				where: { id: input },
			});
		}),

	getAll: protectedProcedure
		.query(async ({ ctx }) => {
			return ctx.prisma.term.findMany({
				where: {
					status: Status.ACTIVE
				},
				orderBy: {
					startDate: 'asc'
				}
			});
		}),

	updateProgramTermSystem: protectedProcedure
		.input(z.object({
			programId: z.string(),
			terms: z.array(z.object({
				id: z.string(),
				name: z.string(),
				startDate: z.date(),
				endDate: z.date(),
				type: termTypeEnum,
				calendarTermId: z.string(),
				assessmentPeriods: z.array(z.object({
					id: z.string(),
					name: z.string(),
					startDate: z.date(),
					endDate: z.date(),
					weight: z.number()
				}))
			})),
			propagateToClassGroups: z.boolean().default(false)
		}))
		.mutation(async ({ ctx, input }) => {
			const termService = new TermManagementService(ctx.prisma);
			return termService.updateProgramTermSystem(input.programId, {
				terms: input.terms,
				propagateToClassGroups: input.propagateToClassGroups
			});
		}),
});
