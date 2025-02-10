"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Program, Status } from "@prisma/client";
import { AssessmentSystemType } from "@/types/assessment";
import { api } from "@/utils/api";
import { ProgramList } from "./ProgramList";
import { ProgramForm } from "./ProgramForm";
import { ProgramView } from "./ProgramView";

interface ProgramWithDetails {
	id: string;
	name: string | null;
	description?: string | null;
	status: Status;
	calendar?: {
		id: string;
		name: string;
	} | null;
	coordinator?: {
		id: string;
		user: {
			name: string | null;
		};
	} | null;
	classGroups: any[];
	assessmentSystem?: {
		type: AssessmentSystemType;
		markingSchemes?: Array<{
			maxMarks: number;
			passingMarks: number;
			gradingScale: Array<{
				grade: string;
				minPercentage: number;
				maxPercentage: number;
			}>;
		}>;
		rubrics?: Array<{
			name: string;
			description?: string;
			criteria: Array<{
				name: string;
				description?: string;
				levels: Array<{
					name: string;
					points: number;
					description?: string;
				}>;
			}>;
		}>;
	} | null;
}

interface Filters {
	search?: string;
	level?: string;
	status?: Status;
	calendarId?: string;
	assessmentType?: AssessmentSystemType;
	sortBy?: 'name' | 'level' | 'createdAt';
	sortOrder?: 'asc' | 'desc';
}


export const ProgramManagement = () => {
	const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
	const [mode, setMode] = useState<'view' | 'edit' | 'create'>('view');
	const [filters, setFilters] = useState<Filters>({
	search: '',
	status: undefined,
	calendarId: undefined,
	assessmentType: undefined,
	sortBy: undefined,
	sortOrder: undefined
});

const utils = api.useContext();

const { data: calendars } = api.academicCalendar.getAllCalendars.useQuery();

const { data: programData, isLoading } = api.program.getAll.useQuery({
    page: 1,
    pageSize: 10,
    ...filters
});

// Use programData.programs instead of programs directly
const programs = programData?.programs || [];
    const { data: coordinators } = api.program.getAvailableCoordinators.useQuery();

const associateCalendar = api.program.associateCalendar.useMutation({
	onSuccess: () => {
		utils.program.getAll.invalidate();
		utils.program.searchPrograms.invalidate();
	},
});

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-4">
            <Card>
<CardHeader>
	<div className="flex justify-between items-center">
		<CardTitle>Program Management</CardTitle>
		<Button 
			onClick={() => {
				setSelectedProgramId(null);
				setMode('create');
			}}
			variant="default"
		>
			Create Program
		</Button>
	</div>
</CardHeader>
<CardContent>
	<div className="mb-6 space-y-4">
                        <div className="flex space-x-4">
                            <Input
                                placeholder="Search programs..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="max-w-sm"
                            />
                            <Input
                                placeholder="Level"
                                value={filters.level}
                                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                                className="max-w-sm"
                            />
                            <Select
                                value={filters.status}
                                onValueChange={(value) => setFilters({ ...filters, status: value as Status })}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.values(Status).map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
<Select
	value={filters.calendarId || "all-calendars"}
	onValueChange={(value) => setFilters({ ...filters, calendarId: value === "all-calendars" ? undefined : value })}
>
	<SelectTrigger className="w-[200px]">
		<SelectValue placeholder="Filter by Calendar" />
	</SelectTrigger>
	<SelectContent>
		<SelectItem value="all-calendars">All Calendars</SelectItem>
		{calendars?.map((calendar) => (
			<SelectItem key={calendar.id} value={calendar.id}>
				{calendar.name}
			</SelectItem>
		))}
	</SelectContent>
</Select>
<Select
	value={filters.assessmentType || ""}
	onValueChange={(value) => setFilters({ ...filters, assessmentType: value as AssessmentSystemType || undefined })}
>
	<SelectTrigger className="w-[200px]">
		<SelectValue placeholder="Assessment System" />
	</SelectTrigger>
	<SelectContent>
		<SelectItem value="">All Types</SelectItem>
		{Object.values(AssessmentSystemType).map((type) => (
			<SelectItem key={type} value={type}>
				{type.replace('_', ' ')}
			</SelectItem>
		))}
	</SelectContent>
</Select>
                        </div>
                        <div className="flex space-x-4">
                            <Select
                                value={filters.sortBy}
                                onValueChange={(value) => setFilters({ ...filters, sortBy: value as 'name' | 'level' | 'createdAt' })}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name">Name</SelectItem>
                                    <SelectItem value="level">Level</SelectItem>
                                    <SelectItem value="createdAt">Created Date</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.sortOrder}
                                onValueChange={(value) => setFilters({ ...filters, sortOrder: value as 'asc' | 'desc' })}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Sort order" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="asc">Ascending</SelectItem>
                                    <SelectItem value="desc">Descending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

<div className="space-y-4">
	{mode === 'view' && (
		<ProgramList 
			programs={programs?.map(p => ({
				id: p.id,
				name: p.name,
				description: p.description,
				status: p.status,
				calendar: p.calendar ? {
					id: p.calendar.id,
					name: p.calendar.name
				} : null,
				coordinator: p.coordinator ? {
					id: p.coordinator.id,
					user: {
						name: p.coordinator.user.name
					}
				} : null,
				classGroups: p.classGroups,
				assessmentSystem: p.assessmentSystem ? {
					type: p.assessmentSystem.type,
					markingSchemes: p.assessmentSystem.markingSchemes,
					rubrics: p.assessmentSystem.rubrics
				} : null
			})) || []} 
			onSelect={(id) => {
				setSelectedProgramId(id);
				setMode('view');
			}}
			onEdit={(id) => {
				setSelectedProgramId(id);
				setMode('edit');
			}}
			calendars={calendars || []}
		/>
	)}

	{mode === 'view' && selectedProgramId && (
		<ProgramView 
			programId={selectedProgramId} 
			onBack={() => {
				setSelectedProgramId(null);
				setMode('view');
			}}
			onEdit={() => setMode('edit')}
		/>
	)}

	{(mode === 'create' || mode === 'edit') && (
		<ProgramForm 
			coordinators={coordinators || []}
			selectedProgram={mode === 'edit' && selectedProgramId ? 
				programs?.find(p => p.id === selectedProgramId) : 
				undefined}
			onSuccess={() => {
				setSelectedProgramId(null);
				setMode('view');
			}}
			onCancel={() => {
				setSelectedProgramId(null);
				setMode('view');
			}}
		/>
	)}
</div>

                </CardContent>
            </Card>
        </div>
    );
};
