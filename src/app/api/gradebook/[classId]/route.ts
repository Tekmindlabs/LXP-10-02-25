import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GradeBookService } from '@/server/services/GradeBookService';
import { AssessmentService } from '@/server/services/AssessmentService';
import { TermManagementService } from '@/server/services/TermManagementService';

const prisma = new PrismaClient();
const assessmentService = new AssessmentService(prisma);
const termService = new TermManagementService(prisma);
const gradeBookService = new GradeBookService(prisma, assessmentService, termService);

export async function GET(
	request: NextRequest,
	{ params }: { params: { classId: string } }
) {
	try {
		const { classId } = params;
		const gradeBook = await prisma.gradeBook.findUnique({
			where: { classId },
			include: {
				subjectRecords: true,
				assessmentSystem: true,
			},
		});

		if (!gradeBook) {
			return NextResponse.json({ error: 'Gradebook not found' }, { status: 404 });
		}

		return NextResponse.json(gradeBook);
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to fetch gradebook' },
			{ status: 500 }
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { classId: string } }
) {
	try {
		const { classId } = params;

		// Check if gradebook already exists
		const existingGradeBook = await prisma.gradeBook.findUnique({
			where: { classId }
		});

		if (existingGradeBook) {
			return NextResponse.json(
				{ error: 'Gradebook already exists for this class' },
				{ status: 409 }
			);
		}

		await gradeBookService.initializeGradeBook(classId);
		
		const newGradeBook = await prisma.gradeBook.findUnique({
			where: { classId },
			include: {
				subjectRecords: true,
				assessmentSystem: true,
			},
		});

		return NextResponse.json({ 
			message: 'Gradebook initialized successfully',
			data: newGradeBook
		});
	} catch (error) {
		console.error('Error initializing gradebook:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to initialize gradebook';
		return NextResponse.json(
			{ error: errorMessage },
			{ status: 500 }
		);
	}
}