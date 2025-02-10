import { PrismaClient } from '@prisma/client';

export async function seedClassrooms(prisma: PrismaClient) {
	console.log('Creating demo classrooms...');

	const classroomsData = [
		{
			name: 'Room 101',
			capacity: 30,
			resources: {
				furniture: ['Student Desks', 'Teacher Desk', 'Chairs'],
				technology: ['Projector', 'Interactive Whiteboard', 'Speakers'],
				storage: ['Bookshelf', 'Supply Cabinet']
			}
		},
		{
			name: 'Room 102',
			capacity: 35,
			resources: {
				furniture: ['Student Desks', 'Teacher Desk', 'Chairs'],
				technology: ['Smart Board', 'Desktop Computers', 'Printer'],
				storage: ['Computer Equipment Cabinet', 'Supply Cabinet']
			}
		},
		{
			name: 'Science Lab A',
			capacity: 25,
			resources: {
				furniture: ['Lab Benches', 'Stools', 'Teacher Desk'],
				technology: ['Digital Microscopes', 'Lab Equipment', 'Safety Equipment'],
				storage: ['Chemical Storage Cabinet', 'Equipment Cabinet', 'Safety Equipment Storage']
			}
		},
		{
			name: 'Computer Lab',
			capacity: 30,
			resources: {
				furniture: ['Computer Desks', 'Ergonomic Chairs', 'Teacher Station'],
				technology: ['Desktop Computers', 'Projector', 'Network Equipment', 'Printers'],
				storage: ['Equipment Cabinet', 'Supply Storage']
			}
		},
		{
			name: 'Library',
			capacity: 50,
			resources: {
				furniture: ['Study Tables', 'Reading Chairs', 'Librarian Desk', 'Book Shelves'],
				technology: ['Library Computers', 'Catalog System', 'Printers'],
				storage: ['Book Storage', 'Media Storage']
			}
		},
		{
			name: 'Auditorium',
			capacity: 200,
			resources: {
				furniture: ['Auditorium Seats', 'Stage', 'Podium'],
				technology: ['Sound System', 'Stage Lighting', 'Projector Screen'],
				storage: ['Equipment Storage', 'Props Storage']
			}
		}
	];

	const classrooms = await Promise.all(
		classroomsData.map(classroom =>
			prisma.classroom.upsert({
				where: { name: classroom.name },
				update: {
					capacity: classroom.capacity,
					resources: JSON.stringify(classroom.resources)
				},
				create: {
					name: classroom.name,
					capacity: classroom.capacity,
					resources: JSON.stringify(classroom.resources)
				}
			})
		)
	);

	console.log('Classrooms seeded successfully');
	return classrooms;
}