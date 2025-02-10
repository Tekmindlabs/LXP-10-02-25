import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

const includeConfig = {
  coordinator: {
    include: {
      user: true,
    },
  },
  calendar: true,
  classGroups: {
    include: {
      classes: {
        include: {
          students: true,
          teachers: true,
        },
      },
    },
  },
  assessmentSystem: {
    include: {
      markingSchemes: {
        include: {
          gradingScale: true
        }
      },
      rubrics: {
        include: {
          criteria: {
            include: {
              levels: true
            }
          }
        }
      }
    }
  },
  termStructures: {
    include: {
      academicTerms: {
        include: {
          assessmentPeriods: true
        }
      }
    }
  }
};

export const programRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const where = {
          ...(input.search && {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' as Prisma.QueryMode } },
              { description: { contains: input.search, mode: 'insensitive' as Prisma.QueryMode } },
            ],
          }),
          ...(input.status && { status: input.status }),
        };

        const programs = await ctx.prisma.program.findMany({
          where,
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
            include: includeConfig,

          orderBy: {
            name: 'asc',
          },
        });

        const totalCount = await ctx.prisma.program.count({ where });

        return {
          programs,
          pagination: {
            currentPage: input.page,
            pageSize: input.pageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / input.pageSize),
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch programs',
          cause: error,
        });
      }
    }),

  getById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      try {
        const program = await ctx.prisma.program.findUnique({
          where: { id: input },
          include: {
            coordinator: {
              include: {
                user: true,
              },
            },
            calendar: true,
            classGroups: {
              include: {
                classes: {
                  include: {
                    students: true,
                  },
                },
              },
            },
          },
        });

        if (!program) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Program not found",
          });
        }

        return program;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch program",
          cause: error,
        });
      }
    }),

  getByProgramId: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      try {
        const program = await ctx.prisma.program.findUnique({
          where: { id: input },
          include: {
            coordinator: {
              include: {
                user: true,
              },
            },
            calendar: true,
            classGroups: {
              include: {
                classes: {
                  include: {
                    students: true,
                  },
                },
              },
            },
          },
        });

        if (!program) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Program not found",
          });
        }

        return program;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch program",
          cause: error,
        });
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        calendarId: z.string(),
        coordinatorId: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
        termSystem: z.object({
          type: z.enum(['semesterBased', 'termBased']),
          terms: z.array(z.object({
          name: z.string(),
          startDate: z.date(),
          endDate: z.date(),
          type: z.enum(['SEMESTER', 'TERM', 'QUARTER']),
          assessmentPeriods: z.array(z.object({
            name: z.string(),
            startDate: z.date(),
            endDate: z.date(),
            weight: z.number()
          }))
          }))
        }).optional(),
        assessmentSystem: z.object({
          type: z.enum(["MARKING_SCHEME", "RUBRIC", "HYBRID", "CGPA"]),
          markingScheme: z.object({
            maxMarks: z.number().min(0),
            passingMarks: z.number().min(0),
            gradingScale: z.array(z.object({
              grade: z.string(),
              minPercentage: z.number().min(0).max(100),
              maxPercentage: z.number().min(0).max(100)
            }))
          }).optional(),
          rubric: z.object({
            name: z.string(),
            description: z.string().optional(),
            criteria: z.array(z.object({
              name: z.string(),
              description: z.string().optional(),
              levels: z.array(z.object({
                name: z.string(),
                points: z.number().min(0),
                description: z.string().optional()
              }))
            }))
          }).optional()
        }).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Validate calendar exists and get settings
        const calendar = await ctx.prisma.calendar.findUnique({
          where: { id: input.calendarId },
          include: { terms: true }
        });

        if (!calendar) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Calendar not found",
          });
        }

        // Validate coordinator if provided
        if (input.coordinatorId) {
            const coordinator = await ctx.prisma.coordinatorProfile.findUnique({
            where: { id: input.coordinatorId },
          });

          if (!coordinator) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Coordinator not found",
            });
          }
        }

        const program = await ctx.prisma.program.create({
          data: {
          name: input.name,
          description: input.description,
          calendar: {
            connect: { id: input.calendarId }
          },
          coordinator: input.coordinatorId
            ? {
              connect: { id: input.coordinatorId },
            }
            : undefined,
            status: input.status,
            termSystem: input.termSystem?.type || 'SEMESTER',
            termStructures: input.termSystem ? {
            create: input.termSystem.terms.map((term, index) => ({
              name: term.name,
              startDate: term.startDate,
              endDate: term.endDate,
              order: index + 1,
              weight: 1.0,
              status: 'ACTIVE',
              academicTerms: {
              create: {
                name: term.name,
                status: 'ACTIVE',
                assessmentWeightage: 100,
                assessmentPeriods: {
                create: term.assessmentPeriods
                }
              }
              }
            }))
            } : undefined,
            ...(input.assessmentSystem && {
            assessmentSystem: {
              create: {
              name: input.name + " Assessment System",
              description: "Default assessment system for " + input.name,
              type: input.assessmentSystem.type,
              ...(input.assessmentSystem.markingScheme && {
                markingSchemes: {
                create: {
                  name: "Default Marking Scheme",
                  maxMarks: input.assessmentSystem.markingScheme.maxMarks,
                  passingMarks: input.assessmentSystem.markingScheme.passingMarks,
                  gradingScale: {
                  createMany: {
                    data: input.assessmentSystem.markingScheme.gradingScale
                  }
                  }
                }
                }
              }),
              ...(input.assessmentSystem.rubric && {
                rubrics: {
                create: {
                  name: input.assessmentSystem.rubric.name,
                  description: input.assessmentSystem.rubric.description,
                  criteria: {
                  create: input.assessmentSystem.rubric.criteria.map(criterion => ({
                    name: criterion.name,
                    description: criterion.description,
                    levels: {
                    createMany: {
                      data: criterion.levels
                    }
                    }
                  }))
                  }
                }
                }
              })
              }
            }
            })
          },
          include: includeConfig
        });

        return program;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create program",
          cause: error,
        });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        calendarId: z.string().optional(),
        coordinatorId: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
        termSystem: z.object({
        type: z.enum(['semesterBased', 'termBased']),
        terms: z.array(z.object({
          name: z.string(),
          startDate: z.date(),
          endDate: z.date(),
          type: z.enum(['SEMESTER', 'TERM', 'QUARTER']),
          assessmentPeriods: z.array(z.object({
          name: z.string(),
          startDate: z.date(),
          endDate: z.date(),
          weight: z.number()
          }))
        }))
        }).optional(),
        assessmentSystem: z.object({
        type: z.enum(["MARKING_SCHEME", "RUBRIC", "HYBRID", "CGPA"]),
        markingScheme: z.object({
        maxMarks: z.number().min(0),
        passingMarks: z.number().min(0),
        gradingScale: z.array(z.object({
          grade: z.string(),
          minPercentage: z.number().min(0).max(100),
          maxPercentage: z.number().min(0).max(100)
        }))
        }).optional(),
        rubric: z.object({
        name: z.string(),
        description: z.string().optional(),
        criteria: z.array(z.object({
          name: z.string(),
          description: z.string().optional(),
          levels: z.array(z.object({
          name: z.string(),
          points: z.number().min(0),
          description: z.string().optional()
          }))
        }))
        }).optional()
      }).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if program exists
        const existingProgram = await ctx.prisma.program.findUnique({
          where: { id: input.id },
        });

        if (!existingProgram) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Program not found",
          });
        }

        // Validate calendar if provided
        if (input.calendarId) {
          const calendar = await ctx.prisma.calendar.findUnique({
            where: { id: input.calendarId },
          });

          if (!calendar) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Calendar not found",
            });
          }
        }

        // Validate coordinator if provided
        if (input.coordinatorId) {
          const coordinator = await ctx.prisma.coordinatorProfile.findUnique({
            where: { id: input.coordinatorId },
          });

          if (!coordinator) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Coordinator not found",
            });
          }
        }

        const { id, calendarId, coordinatorId, assessmentSystem, termSystem, ...data } = input;
        
        const updatedProgram = await ctx.prisma.program.update({
          where: { id },
          data: {
            ...data,
            calendar: calendarId ? { connect: { id: calendarId } } : undefined,
            coordinator: coordinatorId ? { connect: { id: coordinatorId } } : undefined,
            termSystem: termSystem?.type || undefined,
            termStructures: termSystem ? {
            deleteMany: {},
            create: termSystem.terms.map((term, index) => ({
              name: term.name,
              startDate: term.startDate,
              endDate: term.endDate,
              order: index + 1,
              weight: 1.0,
              status: 'ACTIVE',
              academicTerms: {
              create: {
                name: term.name,
                status: 'ACTIVE',
                assessmentWeightage: 100,
                assessmentPeriods: {
                create: term.assessmentPeriods
                }
              }
              }
            }))
            } : undefined,
            ...(assessmentSystem && {
            assessmentSystem: {
              upsert: {
              create: {
                name: data.name + " Assessment System",
                description: "Default assessment system for " + data.name,
                type: assessmentSystem.type,
                ...(assessmentSystem.markingScheme && {
                markingSchemes: {
                  create: {
                  name: "Default Marking Scheme",
                  maxMarks: assessmentSystem.markingScheme.maxMarks,
                  passingMarks: assessmentSystem.markingScheme.passingMarks,
                  gradingScale: {
                    createMany: {
                    data: assessmentSystem.markingScheme.gradingScale
                    }
                  }
                  }
                }
                }),
                ...(assessmentSystem.rubric && {
                rubrics: {
                  create: {
                  name: assessmentSystem.rubric.name,
                  description: assessmentSystem.rubric.description,
                  criteria: {
                    create: assessmentSystem.rubric.criteria.map(criterion => ({
                    name: criterion.name,
                    description: criterion.description,
                    levels: {
                      createMany: {
                      data: criterion.levels
                      }
                    }
                    }))
                  }
                  }
                }
                })
              },
              update: {
                type: assessmentSystem.type,
                ...(assessmentSystem.markingScheme && {
                markingSchemes: {
                  deleteMany: {},
                  create: {
                  name: "Default Marking Scheme",
                  maxMarks: assessmentSystem.markingScheme.maxMarks,
                  passingMarks: assessmentSystem.markingScheme.passingMarks,
                  gradingScale: {
                    createMany: {
                    data: assessmentSystem.markingScheme.gradingScale
                    }
                  }
                  }
                }
                }),
                ...(assessmentSystem.rubric && {
                rubrics: {
                  deleteMany: {},
                  create: {
                  name: assessmentSystem.rubric.name,
                  description: assessmentSystem.rubric.description,
                  criteria: {
                    create: assessmentSystem.rubric.criteria.map(criterion => ({
                    name: criterion.name,
                    description: criterion.description,
                    levels: {
                      createMany: {
                      data: criterion.levels
                      }
                    }
                    }))
                  }
                  }
                }
                })
              }
              }
            }
            })
          },
          include: includeConfig
        });

        return updatedProgram;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update program",
          cause: error,
        });
      }
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      try {
        const program = await ctx.prisma.program.delete({
          where: { id: input },
        });

        return program;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete program",
          cause: error,
        });
      }
    }),

  getAvailableCoordinators: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const coordinators = await ctx.prisma.coordinatorProfile.findMany({
          include: {
            user: true,
          },
        });

        return coordinators;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch available coordinators',
          cause: error,
        });
      }
    }),


  associateCalendar: protectedProcedure
    .input(
      z.object({
        programId: z.string(),
        calendarId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const program = await ctx.prisma.program.update({
          where: { id: input.programId },
          data: {
            calendar: {
              connect: { id: input.calendarId },
            },
          },
          include: {
            coordinator: {
              include: {
                user: true,
              },
            },
            calendar: true,
            classGroups: {
              include: {
                classes: {
                  include: {
                    students: true,
                    teachers: true,
                  },
                },
              },
            },
          },
        });

        return program;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to associate calendar',
          cause: error,
        });
      }
    }),

  getCalendarSettings: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      try {
        const calendar = await ctx.prisma.calendar.findUnique({
          where: { id: input },
          include: { 
            terms: true,
            events: true
          }
        });

        if (!calendar) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Calendar not found",
          });
        }

        return calendar;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch calendar settings",
          cause: error,
        });
      }
    }),

  searchPrograms: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      try {
        const programs = await ctx.prisma.program.findMany({
          where: {
            OR: [
              { name: { contains: input, mode: 'insensitive' as Prisma.QueryMode } },
              { description: { contains: input, mode: 'insensitive' as Prisma.QueryMode } },
            ],
          },
          take: 10,
          include: {
            coordinator: {
              include: {
                user: true,
              },
            },
            calendar: true,
          },
        });

        return programs;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search programs',
          cause: error,
        });
      }
    }),
});
