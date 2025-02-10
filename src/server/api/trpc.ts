import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { Permission, DefaultRoles } from "@/utils/permissions";
import { getServerAuthSession } from "@/server/auth";
import { prisma } from "@/server/db";
import type { Session } from "next-auth";
import { type DefaultSession } from "next-auth";

// Extend Session type to include roles
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      roles: string[];
      permissions: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    roles: string[];
    permissions: string[];
  }
}


export type Context = {
  prisma: typeof prisma;
  session: Session | null;
};



export const createTRPCContext = async () => {
  const session = await getServerAuthSession();

  if (session?.user) {
    const userWithRoles = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        teacherProfile: true,
        studentProfile: true,
        coordinatorProfile: true,
        parentProfile: true
      }
    });
    
    // Assign default role based on profile type
    let defaultRole = '';
    if (userWithRoles?.teacherProfile) {
      defaultRole = DefaultRoles.TEACHER;
    } else if (userWithRoles?.studentProfile) {
      defaultRole = DefaultRoles.STUDENT;
    } else if (userWithRoles?.coordinatorProfile) {
      defaultRole = DefaultRoles.PROGRAM_COORDINATOR;
    } else if (userWithRoles?.parentProfile) {
      defaultRole = DefaultRoles.PARENT;
    }

    const assignedRoles = userWithRoles?.userRoles?.map(ur => ur.role.name) || [];
    const userPermissions = userWithRoles?.userRoles.flatMap(
      userRole => userRole.role.permissions.map(rp => rp.permission.name)
    ) || [];

    // If user has super-admin role, keep it exclusive and include all permissions
    if (assignedRoles.includes(DefaultRoles.SUPER_ADMIN)) {
      session.user.roles = [DefaultRoles.SUPER_ADMIN];
      session.user.permissions = userPermissions;
    } else {
      // Combine assigned roles with default role
      session.user.roles = Array.from(new Set([...assignedRoles, defaultRole].filter(Boolean)));
      session.user.permissions = userPermissions;
      
      // If still no roles assigned and user exists, assign default role based on userType
      if (session.user.roles.length === 0 && userWithRoles) {
        if (userWithRoles.teacherProfile) {
          session.user.roles = [DefaultRoles.TEACHER];
        } else if (userWithRoles.studentProfile) {
          session.user.roles = [DefaultRoles.STUDENT];
        } else if (userWithRoles.coordinatorProfile) {
          session.user.roles = [DefaultRoles.PROGRAM_COORDINATOR];
        } else if (userWithRoles.parentProfile) {
          session.user.roles = [DefaultRoles.PARENT];
        } else {
          session.user.roles = [DefaultRoles.STUDENT]; // Fallback role
        }
      }
    }

    console.log('TRPC Context Created:', {
      hasSession: true,
      userId: session.user.id,
      userRoles: session.user.roles,
      userPermissions: session.user.permissions,
      defaultRole,
      assignedRoles
    });
  }

  return {
    prisma,
    session,
  };
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    console.error('TRPC Error:', error);
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
        code: error.code,
        message: error.message,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});


export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

const enforceUserHasPermission = (requiredPermission: Permission) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
      });
    }

    // Get user's roles with their permissions from database
    const userWithRoles = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Check if user has super-admin role
    const isSuperAdmin = userWithRoles?.userRoles.some(
      userRole => userRole.role.name === DefaultRoles.SUPER_ADMIN
    );

    // Extract permissions from roles
    const userPermissions = userWithRoles?.userRoles.flatMap(
      userRole => userRole.role.permissions.map(rp => rp.permission.name)
    ) || [];

    console.log('Permission check:', {
      requiredPermission,
      userRoles: userWithRoles?.userRoles.map(ur => ur.role.name),
      isSuperAdmin,
      userPermissions,
      hasPermission: isSuperAdmin || userPermissions.includes(requiredPermission)
    });

    // Super admin has all permissions, otherwise check specific permission
    if (!isSuperAdmin && !userPermissions.includes(requiredPermission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
      });
    }

    return next({
      ctx: {
        ...ctx,
        session: {
          ...ctx.session,
          user: {
            ...ctx.session.user,
            permissions: userPermissions
          }
        }
      },
    });
  });

export const permissionProtectedProcedure = (permission: Permission) =>
  t.procedure.use(enforceUserHasPermission(permission));