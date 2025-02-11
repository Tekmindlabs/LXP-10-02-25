import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { AttendanceStatus, Prisma } from "@prisma/client";
import { 
    AttendanceTrackingMode, 
    attendanceSchema, 
    bulkAttendanceSchema,
    type CacheConfig,
    type CacheEntry
} from '@/types/attendance';
import { startOfDay, endOfDay, subDays, startOfWeek, format, eachDayOfInterval } from "date-fns";
import { TRPCError } from "@trpc/server";

// Enhanced cache implementation
const CACHE_CONFIG: CacheConfig = {
    enabled: true,
    duration: 5 * 60 * 1000, // 5 minutes
    keys: {
        stats: 'stats',
        dashboard: 'dashboard',
        reports: 'reports'
    }
};

const cache = new Map<string, CacheEntry<any>>();

function getCacheKey(baseKey: string, userId: string): string {
    return `${baseKey}_${userId}`;
}

function setCacheEntry<T>(key: string, data: T): void {
    if (!CACHE_CONFIG.enabled) return;
    
    cache.set(key, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_CONFIG.duration
    });
}

function getCacheEntry<T>(key: string): T | null {
    if (!CACHE_CONFIG.enabled) return null;
    
    const entry = cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

export const attendanceRouter = createTRPCRouter({
    getByDateAndClass: protectedProcedure
      .input(z.object({
        date: z.date(),
        classId: z.string().min(1, "Class ID is required"),
      }))
      .query(async ({ ctx, input }) => {
        try {
          const { date, classId } = input;
          return await ctx.prisma.attendance.findMany({
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
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch attendance records',
            cause: error
          });
        }
      }),
  
    batchSave: protectedProcedure
      .input(bulkAttendanceSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const { date, classId, students } = input;
          
          return await ctx.prisma.$transaction(async (tx) => {
            const results = [];
            
            for (const student of students) {
              // Get existing record if any
              const existing = await tx.attendance.findUnique({
                where: {
                  studentId_date: {
                    studentId: student.studentId,
                    date: date,
                  }
                }
              });

              // Create or update attendance record
              const result = await tx.attendance.upsert({
                where: {
                  studentId_date: {
                    studentId: student.studentId,
                    date: date,
                  }
                },
                update: {
                  status: student.status,
                  notes: student.notes,
                },
                create: {
                  studentId: student.studentId,
                  classId: classId,
                  date: date,
                  status: student.status,
                  notes: student.notes,
                },
              });

              // Create audit log if status changed
              if (existing && existing.status !== student.status) {
                await tx.attendanceAudit.create({
                  data: {
                    attendanceId: result.id,
                    modifiedBy: ctx.session.user.id,
                    modifiedAt: new Date(),
                    oldValue: existing.status,
                    newValue: student.status,
                    reason: student.notes
                  }
                });
              }

              results.push(result);
            }

            return results;
          });
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to save attendance records',
            cause: error
          });
        }
      }),

    generateReport: protectedProcedure
      .input(z.object({
        period: z.enum(['daily', 'weekly', 'monthly', 'custom']),
        startDate: z.date(),
        endDate: z.date(),
        classId: z.string(),
        subjectId: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        try {
          const { startDate, endDate, classId, subjectId } = input;
          
          const whereClause: Prisma.AttendanceWhereInput = {
            date: {
              gte: startOfDay(startDate),
              lte: endOfDay(endDate),
            },
            classId,
            ...(subjectId && { subjectId })
          };

          const [attendance, students] = await Promise.all([
            ctx.prisma.attendance.findMany({
              where: whereClause,
              include: {
                student: {
                  include: { user: true }
                }
              },
            }),
            ctx.prisma.studentProfile.findMany({
              where: { classId },
              include: { user: true }
            })
          ]);

          // Calculate daily trends
          const dailyStats = eachDayOfInterval({ start: startDate, end: endDate })
            .map(date => {
              const dayAttendance = attendance.filter(a => 
                startOfDay(a.date).getTime() === startOfDay(date).getTime()
              );
              
              return {
                date: format(date, 'yyyy-MM-dd'),
                status: {
                  [AttendanceStatus.PRESENT]: dayAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length,
                  [AttendanceStatus.ABSENT]: dayAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length,
                  [AttendanceStatus.LATE]: dayAttendance.filter(a => a.status === AttendanceStatus.LATE).length,
                  [AttendanceStatus.EXCUSED]: dayAttendance.filter(a => a.status === AttendanceStatus.EXCUSED).length,
                }
              };
            });

          // Calculate student-wise statistics
          const studentDetails = students.map(student => {
            const studentAttendance = attendance.filter(a => a.studentId === student.id);
            const total = studentAttendance.length;
            
            return {
              studentId: student.id,
              name: student.user.name ?? 'Unknown',
              attendance: {
                present: studentAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length,
                absent: studentAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length,
                late: studentAttendance.filter(a => a.status === AttendanceStatus.LATE).length,
                excused: studentAttendance.filter(a => a.status === AttendanceStatus.EXCUSED).length,
                percentage: total > 0 
                  ? (studentAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length * 100) / total 
                  : 0
              }
            };
          });

          const totalRecords = attendance.length;
          const present = attendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
          const absent = attendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
          const late = attendance.filter(a => a.status === AttendanceStatus.LATE).length;
          const excused = attendance.filter(a => a.status === AttendanceStatus.EXCUSED).length;

          return {
            period: input.period,
            startDate,
            endDate,
            classId,
            subjectId,
            stats: {
              present,
              absent,
              late,
              excused,
              percentage: totalRecords > 0 ? (present * 100) / totalRecords : 0,
              trend: dailyStats
            },
            studentDetails
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to generate attendance report',
            cause: error
          });
        }
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