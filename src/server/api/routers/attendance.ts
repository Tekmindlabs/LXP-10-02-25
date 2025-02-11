import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { AttendanceStatus, Prisma } from "@prisma/client";
import { 
    AttendanceTrackingMode, 
    bulkAttendanceSchema,
    type AttendanceStatsData,
    type AttendanceDashboardData
} from '@/types/attendance';


import { startOfDay, endOfDay, subDays, startOfWeek, format, eachDayOfInterval } from "date-fns";
import { TRPCError } from "@trpc/server";
// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const statsCache = new Map<string, {
    data: AttendanceStatsData | AttendanceDashboardData;
    timestamp: number;
    expiresAt: number;
}>();

function getCacheEntry<T>(key: string): T | null {
    const entry = statsCache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
        statsCache.delete(key);
        return null;
    }
    return entry.data as T;
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
              const existing = await tx.attendance.findFirst({
                where: {
                  studentId: student.studentId,
                  date: {
                    gte: startOfDay(date),
                    lte: endOfDay(date),
                  }
                }
              });

              // Create or update attendance record
              const result = await tx.attendance.upsert({
                where: {
                  studentId_date: {
                    studentId: student.studentId,
                    date: date
                  }
                },
                update: {
                  status: student.status,
                  notes: student.notes
                },
                create: {
                  studentId: student.studentId,
                  classId: classId,
                  date: date,
                  status: student.status,
                  notes: student.notes
                }
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
                    reason: student.notes,
                    metadata: { source: 'batch_update' }
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
        subjectId: z.string()
      }))
      .query(async ({ ctx, input }) => {
        const { date } = input;
        return ctx.prisma.attendance.findMany({
          where: {
            date: {
              gte: startOfDay(date),
              lte: endOfDay(date)
            }
          },
          include: {
            student: {
              include: {
                user: true
              }
            },
            class: true
          }
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
                } : undefined
            };
            
            const attendance = await ctx.prisma.attendance.findMany({
                where: whereClause,
                include: {
                    class: true
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
                notificationSettings: z.string()
            }),
        }))
        .mutation(async ({ ctx, input }) => {
            const { settings } = input;
            
            await ctx.prisma.attendanceSettings.upsert({
                where: { id: '1' },
                create: {
                    id: '1',
                    trackingMode: settings.trackingMode,
                    defaultMode: settings.defaultMode,
                    subjectWiseEnabled: settings.subjectWiseEnabled,
                },
                update: {
                    trackingMode: settings.trackingMode,
                    defaultMode: settings.defaultMode,
                    subjectWiseEnabled: settings.subjectWiseEnabled,
                }
            });

            
            return settings;
        }),



    getSettings: protectedProcedure
        .query(async ({ ctx }) => {
            const settings = await ctx.prisma.attendanceSettings.findFirst({
                where: { id: '1' }
            });

            if (!settings) {
                return {
                    trackingMode: AttendanceTrackingMode.CLASS,
                    defaultMode: 'CLASS',
                    subjectWiseEnabled: false,
                    notificationSettings: JSON.stringify({
                        enableAbsenceAlerts: true,
                        consecutiveAbsenceThreshold: 3,
                        lowAttendanceThreshold: 75
                    })
                };
            }

            return {
                ...settings,
                notificationSettings: JSON.stringify({
                    enableAbsenceAlerts: true,
                    consecutiveAbsenceThreshold: 3,
                    lowAttendanceThreshold: 75
                })
            };
        }),



    getStats: protectedProcedure.query(async ({ ctx }): Promise<AttendanceStatsData> => {
    try {
        const cacheKey = `stats_${ctx.session.user.id}`;
        const cached = getCacheEntry<AttendanceStatsData>(cacheKey);
        
        if (cached) {
            return cached;
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

        const result: AttendanceStatsData = {
            todayStats: {
                present: todayAttendance.find(a => a.status === 'PRESENT')?._count ?? 0,
                absent: todayAttendance.find(a => a.status === 'ABSENT')?._count ?? 0,
                late: todayAttendance.find(a => a.status === 'LATE')?._count ?? 0,
                excused: todayAttendance.find(a => a.status === 'EXCUSED')?._count ?? 0,
                total: todayAttendance.reduce((acc, curr) => acc + curr._count, 0),
                percentage: 0
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

                    // Calculate consecutive absences
                    const consecutiveAbsences = await ctx.prisma.attendance.count({
                        where: {
                            studentId: record.studentId,
                            status: 'ABSENT',
                            date: {
                                gte: thirtyDaysAgo
                            }
                        }
                    });

                    // Get last attendance
                    const lastAttendance = await ctx.prisma.attendance.findFirst({
                        where: {
                            studentId: record.studentId
                        },
                        orderBy: {
                            date: 'desc'
                        }
                    });

                    return {
                        name: student?.user.name ?? 'Unknown',
                        absences: record._count?.studentId ?? 0,
                        consecutiveAbsences,
                        lastAttendance: lastAttendance?.date
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

        statsCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          expiresAt: Date.now() + CACHE_DURATION
        });
        return result;
    } catch (error) {
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch attendance statistics',
            cause: error
        });
    }
}),



getDashboardData: protectedProcedure.query(async ({ ctx }): Promise<AttendanceDashboardData> => {
    try {
        const cacheKey = `dashboard_${ctx.session.user.id}`;
        const cached = getCacheEntry<AttendanceDashboardData>(cacheKey);
        
        if (cached) {
            return cached;
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
                    const dayAttendance = await ctx.prisma.attendance.groupBy({
                        by: ['status'],
                        where: { date: record.date },
                        _count: true
                    });

                    return {
                        date: format(record.date, 'yyyy-MM-dd'),
                        percentage: (dayAttendance.find(a => a.status === 'PRESENT')?._count ?? 0) * 100 / record._count._all,
                        breakdown: {
                            PRESENT: dayAttendance.find(a => a.status === 'PRESENT')?._count ?? 0,
                            ABSENT: dayAttendance.find(a => a.status === 'ABSENT')?._count ?? 0,
                            LATE: dayAttendance.find(a => a.status === 'LATE')?._count ?? 0,
                            EXCUSED: dayAttendance.find(a => a.status === 'EXCUSED')?._count ?? 0
                        }
                    };
                })
            ),
            classAttendance: classAttendance.map(cls => ({
                className: cls.name,
                present: cls.attendance.filter(a => a.status === 'PRESENT').length,
                absent: cls.attendance.filter(a => a.status === 'ABSENT').length,
                late: cls.attendance.filter(a => a.status === 'LATE').length,
                excused: cls.attendance.filter(a => a.status === 'EXCUSED').length,
                percentage: cls.attendance.length > 0 
                    ? (cls.attendance.filter(a => a.status === 'PRESENT').length * 100) / cls.attendance.length 
                    : 0
            }))
        };

        statsCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          expiresAt: Date.now() + CACHE_DURATION
        });
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