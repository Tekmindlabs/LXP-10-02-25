import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { AttendanceStatus, Prisma } from "@prisma/client";
import { AttendanceTrackingMode } from '@/types/attendance';
import { startOfDay, endOfDay, subDays, startOfWeek, format } from "date-fns";
import { TRPCError } from "@trpc/server";

// Cache implementation
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}
const statsCache = new Map<string, CacheEntry<any>>();

export const attendanceRouter = createTRPCRouter({
    getByDateAndClass: protectedProcedure
      .input(z.object({
        date: z.date(),
        classId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const { date, classId } = input;
        return ctx.prisma.attendance.findMany({
          where: {
            date: {
              gte: startOfDay(date),
              lte: endOfDay(date),
            },
            student: {
              classId: classId
            }
          },
          include: {
            student: {
              include: {
                user: true
              }
            }
          },
        });
      }),
  
    batchSave: protectedProcedure
      .input(z.object({
        records: z.array(z.object({
          studentId: z.string(),
          classId: z.string(),
          date: z.date(),
          status: z.nativeEnum(AttendanceStatus),
          notes: z.string().optional()
        }))
      }))
      .mutation(async ({ ctx, input }) => {
        const { records } = input;
        
        return ctx.prisma.$transaction(
          records.map(record =>
            ctx.prisma.attendance.upsert({
              where: {
                studentId_date: {
                  studentId: record.studentId,
                  date: record.date,
                }
              },

              update: {
                status: record.status,
                notes: record.notes,
              },
              create: {
                studentId: record.studentId,
                classId: record.classId,
                date: record.date,
                status: record.status,
                notes: record.notes,
              },
            })
          )
        );
      }),

    getByDateAndSubject: protectedProcedure
        .input(z.object({
            date: z.date(),
            subjectId: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const { date, subjectId } = input;
            return ctx.prisma.attendance.findMany({
                where: {
                    date: {
                        gte: startOfDay(date),
                        lte: endOfDay(date),
                    },
                    AND: {
                        subject: {
                            id: subjectId
                        }
                    }
                },
                include: {
                    student: {
                        include: {
                            user: true
                        }
                    },
                    class: true,
                },
            });
        }),

    getStatsBySubject: protectedProcedure
        .input(z.object({
            subjectId: z.string(),
            dateRange: z.object({
                start: z.date(),
                end: z.date(),
            }).optional(),
        }))
        .query(async ({ ctx, input }) => {
            const whereClause: Prisma.AttendanceWhereInput = {
                date: input.dateRange ? {
                    gte: startOfDay(input.dateRange.start),
                    lte: endOfDay(input.dateRange.end),
                } : undefined,
                subject: {
                    id: input.subjectId
                }
            };
            
            const attendance = await ctx.prisma.attendance.findMany({
                where: whereClause,
                include: {
                    class: true,
                    subject: true
                }
            });

            
            const totalAttendance = attendance.length;
            const presentAttendance = attendance.filter(a => a.status === 'PRESENT').length;
            
            return {
                total: totalAttendance,
                present: presentAttendance,
                absent: totalAttendance - presentAttendance,
                percentage: totalAttendance > 0 ? (presentAttendance * 100) / totalAttendance : 0
            };
        }),

    updateAttendanceSettings: protectedProcedure
        .input(z.object({
            settings: z.object({
                trackingMode: z.nativeEnum(AttendanceTrackingMode),
                defaultMode: z.string(),
                subjectWiseEnabled: z.boolean(),
            }),
        }))
        .mutation(async ({ ctx, input }) => {
            const { settings } = input;
            const result = await ctx.prisma.$transaction(async (tx) => {
                const existingSettings = await tx.attendance.findFirst({
                    where: { id: '1' },
                });

                if (!existingSettings) {
                    return tx.attendance.create({
                        data: {
                            id: '1',
                            status: input.settings.trackingMode === AttendanceTrackingMode.CLASS ? 'PRESENT' : 'ABSENT',
                            date: new Date(),
                            studentId: 'system',
                            classId: 'system',
                        },
                    });
                }

                return tx.attendance.update({
                    where: { id: '1' },
                    data: {
                        status: input.settings.trackingMode === AttendanceTrackingMode.CLASS ? 'PRESENT' : 'ABSENT',
                    },
                });
            });
            
            return input.settings;
        }),

    getSettings: protectedProcedure
        .query(async ({ ctx }) => {
            const settings = await ctx.prisma.attendance.findFirst({
                where: { 
                    id: '1',
                    studentId: 'system',
                    classId: 'system'
                },
            });

            return settings ?? {
                id: '1',
                trackingMode: AttendanceTrackingMode.CLASS,
                defaultMode: 'CLASS',
                subjectWiseEnabled: false,
            };
        }),

    getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
        const cacheKey = `stats_${ctx.session.user.id}`;
        const cached = statsCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }

        const today = new Date();
        const weekStart = startOfWeek(today);
        const thirtyDaysAgo = subDays(today, 30);

        const [todayAttendance, weeklyAttendance, absentStudents, classAttendance] = await Promise.all([
            // Today's attendance stats
            ctx.prisma.attendance.groupBy({
                by: ['status'],
                where: {
                    date: {
                        gte: startOfDay(today),
                        lte: endOfDay(today)
                    }
                },
                _count: true
            }),

            // Weekly attendance
            ctx.prisma.attendance.findMany({
                where: {
                    date: {
                        gte: weekStart,
                        lte: today
                    }
                }
            }),

            // Most absent students
            ctx.prisma.attendance.groupBy({
                by: ['studentId'],
                where: {
                    status: 'ABSENT',
                    date: {
                        gte: thirtyDaysAgo
                    }
                },
                _count: {
                    studentId: true
                },
                orderBy: {
                    _count: {
                        studentId: 'desc'
                    }
                },
                take: 3
            }),

            // Class attendance
            ctx.prisma.class.findMany({
                include: {
                    attendance: {
                        where: {
                            date: today
                        }
                    },
                    students: true
                },
                take: 3
            })
        ]);

        const result = {
            todayStats: {
                present: todayAttendance.find(a => a.status === 'PRESENT')?._count ?? 0,
                absent: todayAttendance.find(a => a.status === 'ABSENT')?._count ?? 0,
                total: todayAttendance.reduce((acc, curr) => acc + curr._count, 0)
            },
            weeklyPercentage: weeklyAttendance.length > 0
                ? (weeklyAttendance.filter(a => a.status === 'PRESENT').length * 100) / weeklyAttendance.length
                : 0,
            mostAbsentStudents: await Promise.all(
                absentStudents.map(async (record) => {
                    const student = await ctx.prisma.studentProfile.findUnique({
                        where: { id: record.studentId },
                        include: { user: true }
                    });
                    return {
                        name: student?.user.name ?? 'Unknown',
                        absences: record._count?.studentId ?? 0
                    };
                })
            ),
            lowAttendanceClasses: classAttendance.map(cls => ({
                name: cls.name,
                percentage: cls.students.length > 0
                    ? (cls.attendance.filter(a => a.status === 'PRESENT').length * 100) / cls.students.length
                    : 0
            })).sort((a, b) => a.percentage - b.percentage)
        };

        statsCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
    } catch (error) {
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch attendance statistics',
            cause: error
        });
    }
}),



getDashboardData: protectedProcedure.query(async ({ ctx }) => {
    try {
        const cacheKey = `dashboard_${ctx.session.user.id}`;
        const cached = statsCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }

        const today = new Date();
        const lastWeek = subDays(today, 7);

        const [attendanceByDate, classAttendance] = await Promise.all([
            // Attendance trend
            ctx.prisma.attendance.groupBy({
                by: ['date'],
                where: {
                    date: {
                        gte: lastWeek,
                        lte: today
                    }
                },
                _count: {
                    _all: true
                }
            }),

            // Class attendance
            ctx.prisma.class.findMany({
                include: {
                    attendance: {
                        where: {
                            date: {
                                gte: lastWeek,
                                lte: today
                            }
                        }
                    }
                }
            })
        ]);

        const result = {
            attendanceTrend: await Promise.all(
                attendanceByDate.map(async (record) => {
                    const dayAttendance = await ctx.prisma.attendance.count({
                        where: {
                            date: record.date,
                            status: 'PRESENT'
                        }
                    });
                    return {
                        date: format(record.date, 'yyyy-MM-dd'),
                        percentage: (dayAttendance * 100) / record._count._all
                    };
                })
            ),
            classAttendance: classAttendance.map(cls => {
                const present = cls.attendance.filter(a => a.status === 'PRESENT').length;
                const total = cls.attendance.length;
                return {
                    className: cls.name,
                    present,
                    absent: total - present,
                    percentage: total > 0 ? (present * 100) / total : 0
                };
            })
        };

        statsCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
    } catch (error) {
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch dashboard data',
            cause: error
        });
    }
})


});