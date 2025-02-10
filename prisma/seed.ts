import { PrismaClient } from '@prisma/client';
import { seedPermissions } from './seeds/permissions';
import { seedUsers } from './seeds/users';
import { seedAcademicYear } from './seeds/academic-year';
import { seedCalendar } from './seeds/calendar';
import { seedPrograms } from './seeds/programs';
import { seedClassGroups } from './seeds/class-groups';
import { seedSubjects } from './seeds/subjects';
import { seedClasses } from './seeds/classes';
import { seedClassrooms } from './seeds/classrooms';
import { seedTimetables } from './seeds/timetables';
import { seedActivities } from './seeds/activities';
import { seedAttendance } from './seeds/attendance';
import { seedSystemSettings } from './seeds/system-settings';
import { seedBrandingSettings } from './seeds/branding-settings';
import { seedInstituteSettings } from './seeds/institute-settings';

const prisma = new PrismaClient();


async function main() {
  console.log('Starting database seeding...');
  
  try {
    // Core system settings
    console.log('Seeding system settings...');
    await seedSystemSettings(prisma);
    await seedBrandingSettings(prisma);
    await seedInstituteSettings(prisma);

    // Core permissions and users
    console.log('Seeding permissions and users...');
    await seedPermissions(prisma);
    const users = await seedUsers(prisma);

    // Academic structure
    console.log('Seeding academic structure...');
    const academicYear = await seedAcademicYear(prisma);
    const calendar = await seedCalendar(prisma, academicYear.id);
    const programs = await seedPrograms(prisma, calendar.id);
    const classGroups = await seedClassGroups(prisma, programs);
    const subjects = await seedSubjects(prisma, classGroups);
    const classes = await seedClasses(prisma, classGroups);
    const classrooms = await seedClassrooms(prisma);

    // Timetables and activities
    console.log('Seeding timetables and activities...');
    await seedTimetables(prisma, { classGroups, classes, subjects, classrooms });
    await seedActivities(prisma, { classes, subjects, classGroups });

    // Attendance records
    console.log('Seeding attendance records...');
    await seedAttendance(prisma);

    console.log('Database seeding completed successfully');

  } catch (error) {
    console.error('Error during database seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Fatal error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


