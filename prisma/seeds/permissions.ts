import { PrismaClient } from '@prisma/client';
import { Permissions, DefaultRoles, RolePermissions } from '@/utils/permissions';

export async function seedPermissions(prisma: PrismaClient) {
	console.log('Seeding permissions and roles...');

	// Create all permissions
	const permissions = await Promise.all(
		Object.values(Permissions).map(async (permissionName) => {
			return prisma.permission.upsert({
				where: { name: permissionName },
				update: {},
				create: {
					name: permissionName,
					description: `Permission to ${permissionName.toLowerCase().replace(':', ' ')}`
				}
			});
		})
	);

	// Create roles
	const roles = await Promise.all([
		// Super Admin Role
		prisma.role.upsert({
			where: { name: DefaultRoles.SUPER_ADMIN },
			update: {},
			create: {
				name: DefaultRoles.SUPER_ADMIN,
				description: 'Super Administrator with all permissions',
				permissions: {
					create: permissions.map(permission => ({
						permission: { connect: { id: permission.id } }
					}))
				}
			}
		}),
		// Admin Role
		prisma.role.upsert({
			where: { name: DefaultRoles.ADMIN },
			update: {},
			create: {
				name: DefaultRoles.ADMIN,
				description: 'Administrator with elevated access'
			}
		}),
		// Program Coordinator Role
		prisma.role.upsert({
			where: { name: DefaultRoles.PROGRAM_COORDINATOR },
			update: {},
			create: {
				name: DefaultRoles.PROGRAM_COORDINATOR,
				description: 'Program Coordinator role'
			}
		}),
		// Teacher Role
		prisma.role.upsert({
			where: { name: DefaultRoles.TEACHER },
			update: {},
			create: {
				name: DefaultRoles.TEACHER,
				description: 'Teacher role'
			}
		}),
		// Student Role
		prisma.role.upsert({
			where: { name: DefaultRoles.STUDENT },
			update: {},
			create: {
				name: DefaultRoles.STUDENT,
				description: 'Student role'
			}
		}),
		// Parent Role
		prisma.role.upsert({
			where: { name: DefaultRoles.PARENT },
			update: {},
			create: {
				name: DefaultRoles.PARENT,
				description: 'Parent role'
			}
		})
	]);

	// Assign permissions to roles based on RolePermissions mapping
	for (const role of roles) {
		const rolePermissions = RolePermissions[role.name as keyof typeof RolePermissions] || [];
		await Promise.all(
			rolePermissions.map(permissionName => {
				const permission = permissions.find(p => p.name === permissionName);
				if (!permission) return Promise.resolve();

				return prisma.rolePermission.upsert({
					where: {
						roleId_permissionId: {
							roleId: role.id,
							permissionId: permission.id
						}
					},
					update: {},
					create: {
						roleId: role.id,
						permissionId: permission.id
					}
				});
			})
		);
	}

	console.log('Permissions and roles seeded successfully');
	return { permissions, roles };
}