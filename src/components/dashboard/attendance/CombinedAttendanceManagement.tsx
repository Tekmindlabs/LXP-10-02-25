
import { useState, useEffect } from 'react';
import { AttendanceTrackingMode } from '@/types/attendance';
import { AttendanceStatus } from '@prisma/client';

import { useSession } from 'next-auth/react';
import { api } from '@/utils/api';

import { AttendanceForm } from './components/AttendanceForm';
import { AttendanceSettings } from './components/AttendanceSettings';
import { DetailedModeAttendance } from './components/DetailedModeAttendance';
import { QuickModeAttendance } from './components/QuickModeAttendance';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSwipeable } from 'react-swipeable';
import { useToast } from '@/hooks/use-toast';
import type { StudentWithUser, AttendanceRecord } from './types';





export const CombinedAttendanceManagement = () => {
  const { data: session, status: sessionStatus } = useSession();
  const { toast } = useToast();
  const utils = api.useUtils();

  const userRoles = session?.user?.roles || [];
  const isAdmin = userRoles.includes('ADMIN');
  const isSuperAdmin = userRoles.includes('SUPER_ADMIN');
  const isTeacher = userRoles.includes('TEACHER');
  const hasAccessPermission = isAdmin || isSuperAdmin || isTeacher;

  // State management
  const [trackingMode, setTrackingMode] = useState<AttendanceTrackingMode>(AttendanceTrackingMode.CLASS);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [attendanceMode, setAttendanceMode] = useState<'quick' | 'detailed'>('quick');
  const [attendanceData, setAttendanceData] = useState<Map<string, AttendanceRecord>>(new Map());


  // API queries
  const { data: students } = api.class.getStudents.useQuery(
    { classId: selectedClass },
    { enabled: !!selectedClass && sessionStatus === 'authenticated' && hasAccessPermission }
  );

  const { data: existingAttendance } = api.attendance.getByDateAndClass.useQuery(
    {
      date: selectedDate,
      classId: selectedClass,
      ...(trackingMode !== AttendanceTrackingMode.CLASS && selectedSubject && { subjectId: selectedSubject })
    },
    { enabled: !!selectedClass }
  );

  const saveAttendanceMutation = api.attendance.batchSave.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Attendance saved successfully",
      });
      void utils.attendance.getByDateAndClass.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Effect to update attendance data when existing records are fetched
  useEffect(() => {
    if (existingAttendance) {
      const newAttendanceData = new Map<string, AttendanceRecord>();
      existingAttendance.forEach(record => {
        newAttendanceData.set(record.studentId, {
            status: record.status,
          notes: record.notes || ''
        });
      });
      setAttendanceData(newAttendanceData);
    }
  }, [existingAttendance]);

  // Handlers
  const handleAttendanceChange = (studentId: string, status: AttendanceStatus, notes?: string) => {
    setAttendanceData(prev => {
      const newMap = new Map(prev);
      newMap.set(studentId, { status, notes: notes || '' });
      return newMap;
    });
  };

  const handlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      const element = eventData.event.target as HTMLElement;
      const studentId = element.getAttribute('data-student-id');
      if (studentId) handleAttendanceChange(studentId, AttendanceStatus.ABSENT);
    },
    onSwipedRight: (eventData) => {
      const element = eventData.event.target as HTMLElement;
      const studentId = element.getAttribute('data-student-id');
      if (studentId) handleAttendanceChange(studentId, AttendanceStatus.PRESENT);
    }
  });

  const handleSaveAttendance = async () => {
    if (!selectedClass) return;

    const attendanceRecords = Array.from(attendanceData.entries()).map(([studentId, record]) => ({
      studentId,
      status: record.status as AttendanceStatus,
      notes: record.notes || undefined
    }));

    try {
      await saveAttendanceMutation.mutateAsync({
      date: selectedDate,
      classId: selectedClass,
      ...(trackingMode !== AttendanceTrackingMode.CLASS && selectedSubject && { subjectId: selectedSubject }),
      students: attendanceRecords
      });
    } catch (error) {
      console.error('Failed to save attendance:', error);
    }
  };

  return (
    <div className="space-y-6">
      <AttendanceSettings
        trackingMode={trackingMode}
        onTrackingModeChange={setTrackingMode}
      />

      <AttendanceForm
        selectedClass={selectedClass}
        selectedDate={selectedDate}
        trackingMode={trackingMode}
        selectedSubject={selectedSubject}
        onClassChange={setSelectedClass}
        onDateChange={setSelectedDate}
        onSubjectChange={(subjectId: string) => setSelectedSubject(subjectId)}
      />

      <Tabs value={attendanceMode} onValueChange={(value) => setAttendanceMode(value as 'quick' | 'detailed')}>
        <TabsList>
          <TabsTrigger value="quick">Quick Mode</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Mode</TabsTrigger>
        </TabsList>

        <TabsContent value="quick">
          <div {...handlers}>
          <QuickModeAttendance
            students={students as StudentWithUser[] || []}
            attendanceData={attendanceData}
            onAttendanceChange={handleAttendanceChange}
          />
          </div>
        </TabsContent>

        <TabsContent value="detailed">
          <DetailedModeAttendance
            students={students as StudentWithUser[] || []}
            attendanceData={attendanceData}
            onAttendanceChange={handleAttendanceChange}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button 
          onClick={handleSaveAttendance}
          disabled={!selectedClass || saveAttendanceMutation.isPending}
        >
          {saveAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
        </Button>
      </div>
    </div>
  );
};
