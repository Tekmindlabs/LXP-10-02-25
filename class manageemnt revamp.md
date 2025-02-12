Based on the current codebase and requirements, here's the updated implementation plan aligned with the existing gradebook system:

### Phase 1: Database Schema & Core Infrastructure

1. **Update Schema Models**
```prisma
// prisma/schema.prisma

model Class {
  id                String    @id @default(cuid())
  name              String
  classGroupId      String
  classGroup        ClassGroup @relation(fields: [classGroupId], references: [id])
  gradeBook         GradeBook? // One-to-one relation
  termStructureId   String?
  status            Status    @default(ACTIVE)
}

model GradeBook {
  id                String    @id @default(cuid())
  classId           String    @unique
  class             Class     @relation(fields: [classId], references: [id])
  assessmentSystemId String
  assessmentSystem  AssessmentSystem @relation(fields: [assessmentSystemId], references: [id])
  termStructureId   String
  termStructure     TermStructure @relation(fields: [termStructureId], references: [id])
  subjectRecords    SubjectGradeRecord[]
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model SubjectGradeRecord {
  id                    String    @id @default(cuid())
  gradeBookId           String
  gradeBook             GradeBook @relation(fields: [gradeBookId], references: [id])
  subjectId             String
  subject               Subject   @relation(fields: [subjectId], references: [id])
  termGrades            Json?     // Stores term-wise grades
  assessmentPeriodGrades Json?    // Stores assessment period grades
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

2. **Service Layer Updates**
```typescript
// Update GradeBookService
class GradeBookService {
  async initializeGradeBook(classId: string): Promise<void> {
    // Updated to use existing assessment system inheritance
    const classData = await this.fetchClassWithInheritedSettings(classId);
    await this.createGradeBookWithSubjects(classData);
  }

  async calculateSubjectTermGrade(
    subjectId: string,
    termId: string,
    studentId: string,
    assessmentSystemId: string
  ): Promise<SubjectTermGrade> {
    // Implement using existing SubjectGradeManager logic
  }
}

// Update SubjectGradeManager
class SubjectGradeManager {
  async initializeSubjectGrades(
    gradeBookId: string,
    subject: any,
    termStructure: any
  ): Promise<void> {
    // Use existing initialization logic with updated schema
  }
}
```

### Phase 2: Feature Implementation

1. **Class Creation Flow**
```typescript
async function createClassWithInheritance(data: CreateClassInput) {
  return await db.$transaction(async (tx) => {
    // Create class
    const newClass = await tx.class.create({
      data: {
        name: data.name,
        classGroupId: data.classGroupId
      }
    });

    // Initialize gradebook with inherited settings
    await gradeBookService.initializeGradeBook(newClass.id);

    // Set up calendar
    await calendarService.inheritClassGroupCalendar(
      data.classGroupId, 
      newClass.id
    );

    return newClass;
  });
}
```

2. **Activity & Assessment Integration**
```typescript
interface ActivityGrade {
  activityId: string;
  studentId: string;
  grade: number;
  assessmentPeriodId: string;
}

async function recordActivityGrade(data: ActivityGrade) {
  // Record grade and update gradebook
  await gradeBookService.updateActivityGrade(data);
  // Recalculate assessment period grade
  await subjectGradeManager.calculateAssessmentPeriodGrade(
    data.subjectId,
    data.assessmentPeriodId,
    data.studentId
  );
}
```

### Phase 3: UI Implementation

1. **Updated Gradebook Component**
```tsx
function GradebookView({ classId }: { classId: string }) {
  const [activeTermId, setActiveTermId] = useState<string>();
  const [activeSubjectId, setActiveSubjectId] = useState<string>();

  return (
    <div className="gradebook-container">
      <TermSelector 
        termId={activeTermId}
        onTermChange={setActiveTermId}
      />
      <SubjectGradesView
        classId={classId}
        termId={activeTermId}
        subjectId={activeSubjectId}
      />
      <AssessmentPeriodsView
        termId={activeTermId}
        subjectId={activeSubjectId}
      />
    </div>
  );
}
```

2. **Grade Input Component**
```tsx
function GradeInput({ 
  activityId, 
  studentId,
  assessmentSystem 
}: GradeInputProps) {
  const [grade, setGrade] = useState<number>();
  
  const handleGradeSubmit = async () => {
    await recordActivityGrade({
      activityId,
      studentId,
      grade,
      assessmentPeriodId
    });
  };

  return (
    <div className="grade-input">
      <input 
        type="number"
        value={grade}
        onChange={(e) => setGrade(Number(e.target.value))}
      />
      <button onClick={handleGradeSubmit}>Save Grade</button>
    </div>
  );
}
```

### Implementation Notes:

1. **Data Flow**
- Class creation triggers gradebook initialization
- Activities automatically create gradebook entries
- Grades update both activity and assessment period records
- Term grades are calculated from assessment period grades

2. **Inheritance Handling**
- Assessment system inherited from class group
- Term structure inherited from class group
- Subjects inherited and linked to gradebook
- Calendar events inherited and maintained

3. **Performance Optimizations**
- Batch grade calculations
- Cache frequently accessed data
- Use transactions for data integrity
- Implement proper indexing

4. **Security Considerations**
- Role-based access control
- Grade modification audit logs
- Input validation
- Error handling

This updated implementation aligns with the existing gradebook system while adding the required inheritance features and maintaining data consistency across the platform.