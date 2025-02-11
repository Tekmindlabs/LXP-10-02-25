
import { useState, useEffect } from 'react';
import { TRPCClientErrorBase } from '@trpc/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AttendanceTrackingMode } from '@/types/attendance';
import type { RouterOutputs } from '@/utils/api';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AttendanceStats } from './AttendanceStats';
import { AttendanceDashboard } from './AttendanceDashboard';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/utils/api';
import { useSession } from 'next-auth/react';
import { AttendanceForm } from './components/AttendanceForm';
import { QuickModeAttendance } from './components/QuickModeAttendance';
import { DetailedModeAttendance } from './components/DetailedModeAttendance';
import { AttendanceSettings } from './components/AttendanceSettings';
import type { AttendanceRecord } from './types';


export const CombinedAttendanceManagement = () => {
  const { data: session } = useSession();

  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClass, setSelectedClass] = useState<string>("no-class-selected");
  const [activeTab, setActiveTab] = useState<string>('quick');

  const [attendanceData, setAttendanceData] = useState<Map<string, AttendanceRecord>>(new Map());
  const [trackingMode, setTrackingMode] = useState<AttendanceTrackingMode>(AttendanceTrackingMode.CLASS);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Subject query
  const { data: subjects } = api.subject.list.useQuery(
    undefined,
    { enabled: !!selectedClass && trackingMode !== AttendanceTrackingMode.CLASS }
  );

  // Filtered subjects computation
  const filteredSubjects = useMemo(() => 
    subjects?.filter(subject => 
      subject.classGroups?.some(group => 
        group.classes?.some((cls: { id: string; name: string }) => cls.id === selectedClass)
      )
    ) ?? [],
    [subjects, selectedClass]
  );

  // Improved role checking
  const userRoles = session?.user?.roles || [];
  const isAdmin = userRoles.includes('ADMIN');
  const isSuperAdmin = userRoles.includes('SUPER_ADMIN');
  const isTeacher = userRoles.includes('TEACHER');
  const hasAccessPermission = isAdmin || isSuperAdmin || isTeacher;

  // Debug logging
  useEffect(() => {
    console.log('Session Status:', sessionStatus);
    console.log('User Roles:', userRoles);
    console.log('Access Permissions:', {
      isAdmin,
      isSuperAdmin,
      isTeacher,
      hasAccessPermission
    });
  }, [sessionStatus, userRoles, isAdmin, isSuperAdmin, isTeacher, hasAccessPermission]);

  // Type definitions for API responses
  type StatsData = RouterOutputs['attendance']['getStats'];
  type DashboardData = RouterOutputs['attendance']['getDashboardData'];


  // Modified class fetching query
  const { data: classes, error: classError } = api.class.list.useQuery(
    undefined,
    {
      enabled: sessionStatus === 'authenticated' && hasAccessPermission,
      retry: 1
    }
  );

  // Effect for error handling
  useEffect(() => {
    if (classError) {
      console.error('Class fetch error:', classError);
      toast({
        title: "Error",
        description: "Failed to load classes: " + classError.message,
        variant: "destructive"
      });
    }
  }, [classError, toast]);




  
  // Fetch students for selected class
  const { data: students } = api.student.list.useQuery(
    { classId: selectedClass! },
    { enabled: !!selectedClass }
  );

  // Fetch existing attendance
  const { data: existingAttendance } = api.attendance.getByDateAndClass.useQuery(
    { date: selectedDate, classId: selectedClass! },
    { enabled: !!selectedClass }
  );

  // Mutations

  const saveAttendanceMutation = api.attendance.batchSave.useMutation();


  // Initialize attendance data from existing records
  useEffect(() => {
    if (existingAttendance) {
      const newAttendanceData = new Map();
      existingAttendance.forEach((record) => {
        newAttendanceData.set(record.studentId, {
          status: record.status,
          notes: record.notes ?? undefined
        });
      });
      setAttendanceData(newAttendanceData);
    }
  }, [existingAttendance]);

  // Swipe handlers for quick mode
  const handlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      const element = eventData.event.target as HTMLElement;
      const studentId = element.getAttribute('data-student-id');
      if (studentId) markAttendance(studentId, AttendanceStatus.ABSENT);
    },
    onSwipedRight: (eventData) => {
      const element = eventData.event.target as HTMLElement;
      const studentId = element.getAttribute('data-student-id');
      if (studentId) markAttendance(studentId, AttendanceStatus.PRESENT);
    }
  });

  const markAttendance = (studentId: string, status: AttendanceStatus, notes?: string) => {
    const record: AttendanceRecord = {
      status,
      notes: notes || attendanceData.get(studentId)?.notes,
      ...(trackingMode !== AttendanceTrackingMode.CLASS && selectedSubject 
        ? { subjectId: selectedSubject }
        : {})
    };
    setAttendanceData(new Map(attendanceData.set(studentId, record)));
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    if (trackingMode !== AttendanceTrackingMode.CLASS && !selectedSubject) {
      toast({
        title: "Error",
        description: "Please select a subject",
        variant: "destructive"
      });
      return;
    }

    try {
      const students = Array.from(attendanceData.entries()).map(([studentId, record]) => ({
        studentId,
        status: record.status,
        notes: record.notes,
        ...(record.subjectId ? { subjectId: record.subjectId } : {})
      }));

      await saveAttendanceMutation.mutateAsync({
        date: selectedDate,
        classId: selectedClass,
        students,
        ...(selectedSubject ? { subjectId: selectedSubject } : {})
      });

      // Optimistic update with proper typing
        utils.attendance.getStats.setData(undefined, (old: StatsData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          todayStats: {
          ...old.todayStats,
          present: old.todayStats.present + students.filter(r => r.status === AttendanceStatus.PRESENT).length,
          absent: old.todayStats.absent + students.filter(r => r.status === AttendanceStatus.ABSENT).length,
          total: old.todayStats.total + students.length
          }
        };
        });

      // Invalidate queries to refresh data
      await Promise.all([
        utils.attendance.getStats.invalidate(),
        utils.attendance.getDashboardData.invalidate()
      ]);

      toast({
        title: "Success",
        description: "Attendance saved successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save attendance",
        variant: "destructive"
      });
    }
  };


  // Fetch stats and dashboard data
  const utils = api.useUtils();

  const { 
    data: statsData, 
    isLoading: isStatsLoading,
    error: statsError 
  } = api.attendance.getStats.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3
  });

  const { 
    data: dashboardData, 
    isLoading: isDashboardLoading,
    error: dashboardError,
    refetch: refetchDashboardData 
  } = api.attendance.getDashboardData.useQuery(undefined, {
    refetchInterval: 30000,
    retry: 3
  });

  const ErrorMessage = ({ error }: { error: TRPCClientErrorBase<any> }) => (
    <div className="p-4 border border-red-200 rounded bg-red-50">
      <p className="text-red-600">Error: {error.message}</p>
    </div>
  );

  // Add auto-refresh effect for active tab
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'dashboard') {
        void refetchDashboardData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab, refetchDashboardData]);


  return (
    <div className="container mx-auto p-4">
        {isStatsLoading ? (
          <LoadingSpinner />
        ) : statsError ? (
          <ErrorMessage error={statsError} />
        ) : (
            {statsData ? (
              <AttendanceStats
              todayStats={statsData.todayStats}
              weeklyPercentage={statsData.weeklyPercentage}
              mostAbsentStudents={statsData.mostAbsentStudents}
              lowAttendanceClasses={statsData.lowAttendanceClasses}
              />
            ) : null}
        )}

      <Card className="mb-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Attendance Management</h2>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

            <TabsContent value="dashboard">
            {isDashboardLoading ? (
              <LoadingSpinner />
            ) : dashboardError ? (
              <ErrorMessage error={dashboardError} />
            ) : (
                {dashboardData ? (
                  <AttendanceDashboard
                  attendanceTrend={dashboardData.attendanceTrend}
                  classAttendance={dashboardData.classAttendance}
                  />
                ) : null}
            )}
            </TabsContent>

          <TabsContent value="mark">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-4">
              <div>
              <label className="block text-sm font-medium mb-2">Select Class</label>
              <Select
                value={selectedClass || "no-class-selected"}
                onValueChange={setSelectedClass}
              >
                  <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionStatus === 'loading' ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : !session?.user ? (
                    <SelectItem value="not-signed-in" disabled>Please sign in</SelectItem>
                    ) : !hasAccessPermission ? (
                    <SelectItem value="unauthorized" disabled>Unauthorized access</SelectItem>
                    ) : classError ? (
                    <SelectItem value="error-loading" disabled>Error loading classes</SelectItem>
                    ) : !classes?.length ? (
                    <SelectItem value="no-classes" disabled>No classes found</SelectItem>
                    ) : (
                    classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                      </SelectItem>
                    ))
                    )}

                    </SelectContent>
                  </Select>
                  </div>
                  {trackingMode !== AttendanceTrackingMode.CLASS && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Subject</label>
                    <Select
                    value={selectedSubject || ""}
                    onValueChange={setSelectedSubject}
                    disabled={!selectedClass}
                    >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                        {filteredSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                      ))}
                    </SelectContent>
                    </Select>
                  </div>
                  )}
                </div>
                <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </div>
          </div>

            {selectedClass && students && (
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quick">Quick Mode</TabsTrigger>
              <TabsTrigger value="detailed">Detailed Mode</TabsTrigger>
              </TabsList>
              <TabsContent value="quick">
                <div className="space-y-2">
                    {students?.map((student: StudentWithUser) => (
                      <div
                      key={student.id}
                      {...handlers}
                      data-student-id={student.id}
                        className={`p-4 rounded-lg shadow transition-colors ${
                        attendanceData.get(student.id)?.status === AttendanceStatus.PRESENT
                        ? 'bg-green-50'
                        : attendanceData.get(student.id)?.status === AttendanceStatus.ABSENT
                        ? 'bg-red-50'
                        : 'bg-white'
                        }`}
                      >
                      <div className="flex justify-between items-center">
                      <span>{student.user.name || 'Unnamed Student'}</span>
                        <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                            onClick={() => markAttendance(student.id, AttendanceStatus.PRESENT, attendanceData.get(student.id)?.notes)}
                        >
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                            onClick={() => markAttendance(student.id, AttendanceStatus.ABSENT, attendanceData.get(student.id)?.notes)}
                        >
                          Absent
                        </Button>
                        </div>
                      </div>
                      </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="detailed">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-2">Student</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students?.map((student: StudentWithUser) => (
                      <tr key={student.id}>
                        <td className="p-2">{student.user.name}</td>
                        <td className="p-2">
                            <Select
                                value={attendanceData.get(student.id)?.status || AttendanceStatus.PRESENT}
                                onValueChange={(value) => markAttendance(student.id, value as AttendanceStatus, attendanceData.get(student.id)?.notes)}
                            >
                              <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                                <SelectContent>
                                {Object.values(AttendanceStatus)
                                  .filter(status => !!status)
                                  .map(status => (
                                  <SelectItem key={status} value={status}>
                                    {status.replace(/_/g, ' ')}
                                  </SelectItem>
                                  ))}
                                </SelectContent>
                            </Select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            className="w-full p-2 border rounded"
                            placeholder="Add notes..."
                            value={attendanceData.get(student.id)?.notes || ''}
                            onChange={(e) => markAttendance(
                              student.id,
                                attendanceData.get(student.id)?.status || AttendanceStatus.PRESENT,
                              e.target.value
                            )}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabsContent>
            </Tabs>
          )}

          </TabsContent>

          <TabsContent value="reports">
            <div className="space-y-4">
            <div className="flex gap-4">
              <Button variant="outline">Daily Report</Button>
              <Button variant="outline">Weekly Report</Button>
              <Button variant="outline">Monthly Report</Button>
            </div>
            <Card>
              <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Generate Custom Report</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                  ))}
                </SelectContent>
                </Select>
                <div className="flex gap-2">
                <Button variant="outline">Export PDF</Button>
                <Button variant="outline">Export Excel</Button>
                </div>
              </div>
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Attendance Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                <span>Attendance Tracking Mode</span>
                <Select
                  value={trackingMode}
                  onValueChange={(value: AttendanceTrackingMode) => setTrackingMode(value)}
                >
                  <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value={AttendanceTrackingMode.CLASS}>Class-wise</SelectItem>
                  <SelectItem value={AttendanceTrackingMode.SUBJECT}>Subject-wise</SelectItem>
                  <SelectItem value={AttendanceTrackingMode.BOTH}>Both</SelectItem>
                  </SelectContent>
                </Select>
                </div>
                <div className="flex items-center justify-between">
                <span>Enable Notifications</span>
                <Switch />
                </div>
              <div className="flex items-center justify-between">
                <span>Auto-mark Late After</span>
                <Select defaultValue="15">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select minutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
                </Select>
              </div>
              </div>
            </CardContent>
            </Card>
          </TabsContent>
          </Tabs>

          <div className="mt-4 flex justify-end">
            <Button
            onClick={handleSave}
            disabled={
              !selectedClass || 
              attendanceData.size === 0 || 
              (trackingMode !== AttendanceTrackingMode.CLASS && !selectedSubject)
            }
            >
            Save Attendance
          </Button>
          </div>
        </CardContent>
        </Card>
      </div>
  );
};