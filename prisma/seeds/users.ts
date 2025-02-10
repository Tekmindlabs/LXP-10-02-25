import { PrismaClient, UserType, Status } from '@prisma/client';
import { DefaultRoles } from '../../src/utils/permissions';
import bcrypt from 'bcryptjs';

export async function seedUsers(prisma: PrismaClient) {
	console.log('Creating demo users...');

	// Get roles
	const roles = await Promise.all(
		Object.values(DefaultRoles).map(roleName =>
			prisma.role.findUnique({ where: { name: roleName } })
		)
	);

	// Create users with profiles
	const users = [];

	// Super Admin User
	const superAdminPassword = await bcrypt.hash('superadmin123', 12);
	users.push(
		await prisma.user.upsert({
			where: { email: 'superadmin@school.com' },
			update: {},
			create: {
				name: 'Super Admin',
				email: 'superadmin@school.com',
				password: superAdminPassword,
				userType: UserType.ADMIN,
				status: Status.ACTIVE,
				phoneNumber: '+1234567889',
				emailVerified: new Date(),
				userRoles: {
					create: {
						roleId: roles.find(r => r?.name === DefaultRoles.SUPER_ADMIN)?.id || ''
					}
				},
				notificationSettings: {
					create: {
						emailNotifications: true,
						pushNotifications: true,
						timetableChanges: true,
						assignmentUpdates: true,
						gradeUpdates: true,
						systemUpdates: true
					}
				}
			}
		})
	);

	// Admin Users
	const adminPassword = await bcrypt.hash('admin123', 12);
	users.push(
		await prisma.user.upsert({
			where: { email: 'admin@school.com' },
			update: {},
			create: {
				name: 'Admin User',
				email: 'admin@school.com',
				password: adminPassword,
				userType: UserType.ADMIN,
				status: Status.ACTIVE,
				phoneNumber: '+1234567890',
				emailVerified: new Date(),
				userRoles: {
					create: {
						roleId: roles.find(r => r?.name === DefaultRoles.ADMIN)?.id || ''
					}
				},
				notificationSettings: {
					create: {
						emailNotifications: true,
						pushNotifications: true,
						timetableChanges: true,
						assignmentUpdates: true,
						gradeUpdates: true,
						systemUpdates: true
					}
				}
			}
		})
	);

	// Teachers
	const teacherPassword = await bcrypt.hash('teacher123', 12);
	const teachers = [
		{
			name: 'John Smith',
			email: 'john.smith@school.com',
			specialization: 'Mathematics',
			phoneNumber: '+1234567891'
		},
		{
			name: 'Sarah Johnson',
			email: 'sarah.johnson@school.com',
			specialization: 'Science',
			phoneNumber: '+1234567892'
		}
	];

	for (const teacher of teachers) {
		users.push(
			await prisma.user.upsert({
				where: { email: teacher.email },
				update: {},
				create: {
					name: teacher.name,
					email: teacher.email,
					password: teacherPassword,
					userType: UserType.TEACHER,
					status: Status.ACTIVE,
					phoneNumber: teacher.phoneNumber,
					emailVerified: new Date(),
					userRoles: {
						create: {
							roleId: roles.find(r => r?.name === DefaultRoles.TEACHER)?.id || ''
						}
					},
					teacherProfile: {
						create: {
							specialization: teacher.specialization,
							teacherType: 'SUBJECT'
						}
					},
					notificationSettings: {
						create: {
							emailNotifications: true,
							pushNotifications: true,
							timetableChanges: true,
							assignmentUpdates: true,
							gradeUpdates: true,
							systemUpdates: true
						}
					}
				}
			})
		);
	}

	// Students
	const studentPassword = await bcrypt.hash('student123', 12);
	const students = [
		{
			name: 'Alice Brown',
			email: 'alice.brown@school.com',
			dateOfBirth: new Date('2010-03-15'),
			phoneNumber: '+1234567893'
		},
		{
			name: 'Bob Wilson',
			email: 'bob.wilson@school.com',
			dateOfBirth: new Date('2010-05-20'),
			phoneNumber: '+1234567894'
		}
	];

	for (const student of students) {
		users.push(
			await prisma.user.upsert({
				where: { email: student.email },
				update: {},
				create: {
					name: student.name,
					email: student.email,
					password: studentPassword,
					userType: UserType.STUDENT,
					status: Status.ACTIVE,
					phoneNumber: student.phoneNumber,
					dateOfBirth: student.dateOfBirth,
					emailVerified: new Date(),
					userRoles: {
						create: {
							roleId: roles.find(r => r?.name === DefaultRoles.STUDENT)?.id || ''
						}
					},
					studentProfile: {
						create: {
							dateOfBirth: student.dateOfBirth
						}
					},
					notificationSettings: {
						create: {
							emailNotifications: true,
							pushNotifications: true,
							timetableChanges: true,
							assignmentUpdates: true,
							gradeUpdates: true,
							systemUpdates: true
						}
					}
				}
			})
		);
	}

	// Parents
	const parentPassword = await bcrypt.hash('parent123', 12);
	const parents = [
		{
			name: 'Mary Brown',
			email: 'mary.brown@example.com',
			phoneNumber: '+1234567895',
			childEmail: 'alice.brown@school.com'
		},
		{
			name: 'James Wilson',
			email: 'james.wilson@example.com',
			phoneNumber: '+1234567896',
			childEmail: 'bob.wilson@school.com'
		}
	];

	for (const parent of parents) {
		const child = await prisma.studentProfile.findFirst({
			where: {
				user: {
					email: parent.childEmail
				}
			}
		});

		if (child) {
			users.push(
				await prisma.user.upsert({
					where: { email: parent.email },
					update: {},
					create: {
						name: parent.name,
						email: parent.email,
						password: parentPassword,
						userType: UserType.PARENT,
						status: Status.ACTIVE,
						phoneNumber: parent.phoneNumber,
						emailVerified: new Date(),
						userRoles: {
							create: {
								roleId: roles.find(r => r?.name === DefaultRoles.PARENT)?.id || ''
							}
						},
						parentProfile: {
							create: {
								children: {
									connect: {
										id: child.id
									}
								}
							}
						},
						notificationSettings: {
							create: {
								emailNotifications: true,
								pushNotifications: true,
								timetableChanges: true,
								assignmentUpdates: true,
								gradeUpdates: true,
								systemUpdates: true
							}
						}
					}
				})
			);
		}
	}

	console.log('Users seeded successfully');
	return users;
}