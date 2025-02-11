import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { api } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { Status } from "@prisma/client";
import { BasicInformation } from "./components/BasicInformation";
import { TermSystemSection } from "./components/TermSystemSection";
import { AssessmentSystem } from "./components/AssessmentSystem"; 
import { ProgramSubmission } from "./components/ProgramSubmission";
import { ProgramFormData, TermSystemType } from "@/types/program";
import { AssessmentSystemType } from "@/types/assessment";
import { defaultFormData, termConfigs } from "@/constants/program";

interface ProgramFormProps {
    selectedProgram?: any;
    coordinators: any[];
    onSuccess: () => void;
}

const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
    </div>
);

const ErrorAlert = ({ message }: { message: string }) => (
    <Alert variant="destructive">
        <AlertDescription>{message}</AlertDescription>
    </Alert>
);

export const ProgramForm = ({ selectedProgram, coordinators, onSuccess }: ProgramFormProps) => {
    const [formData, setFormData] = useState<ProgramFormData>(() => 
        selectedProgram ? transformProgramToFormData(selectedProgram) : defaultFormData
    );

    const { data: calendars, isLoading: calendarsLoading, error: calendarsError } = 
        api.academicCalendar.getAllCalendars.useQuery();
    
    const utils = api.useContext();

    const createMutation = api.program.create.useMutation({
        onSuccess: handleMutationSuccess,
        onError: handleMutationError
    });

    const updateMutation = api.program.update.useMutation({
        onSuccess: handleMutationSuccess,
        onError: handleMutationError
    });

    const handleFormDataChange = (newData: Partial<ProgramFormData>) => {
        setFormData(prev => ({
            ...prev,
            ...newData
        }));
    };

    const handleTermSystemChange = (type: TermSystemType) => {
        const terms = termConfigs[type].terms.map(term => ({
            ...term,
            startDate: new Date(),
            endDate: new Date(),
            type,
            assessmentPeriods: []
        }));

        handleFormDataChange({
            termSystem: {
                type,
                terms
            }
        });
    };

    const handleAddTerm = (type: TermSystemType) => {
        const newTerm = {
            name: `${type} ${formData.termSystem?.terms.length! + 1}`,
            startDate: new Date(),
            endDate: new Date(),
            type,
            assessmentPeriods: []
        };

        handleFormDataChange({
            termSystem: {
                ...formData.termSystem!,
                terms: [...formData.termSystem!.terms, newTerm]
            }
        });
    };

    const handleRemoveTerm = (index: number) => {
        handleFormDataChange({
            termSystem: {
                ...formData.termSystem!,
                terms: formData.termSystem!.terms.filter((_, i) => i !== index)
            }
        });
    };

    const handleTermChange = (index: number, field: string, value: any) => {
        const updatedTerms = [...formData.termSystem!.terms];
        updatedTerms[index] = {
            ...updatedTerms[index],
            [field]: value
        };

        handleFormDataChange({
            termSystem: {
                ...formData.termSystem!,
                terms: updatedTerms
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm(formData)) return;

        const submissionData = prepareSubmissionData(formData);

        if (selectedProgram) {
            updateMutation.mutate({
                id: selectedProgram.id,
                ...submissionData
            });
        } else {
            createMutation.mutate(submissionData);
        }
    };

    function handleMutationSuccess() {
        utils.program.getAll.invalidate();
        onSuccess();
        toast({
            title: "Success",
            description: "Program saved successfully"
        });
    }

    function handleMutationError(error: any) {
        toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
        });
    }

    if (calendarsLoading) {
        return <LoadingSpinner />;
    }

    if (calendarsError) {
        return <ErrorAlert message={calendarsError.message} />;
    }

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>
                    {selectedProgram ? "Edit" : "Create"} Program
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ProgramSubmission 
                    isSubmitting={createMutation.isPending || updateMutation.isPending}
                    isEditing={!!selectedProgram}
                    onSubmit={handleSubmit}
                >
                    <BasicInformation
                        formData={formData}
                        calendars={calendars || []}
                        coordinators={coordinators}
                        onFormDataChange={handleFormDataChange}
                    />

                    <TermSystemSection
                        termSystem={formData.termSystem!}
                        onTermSystemTypeChange={handleTermSystemChange}
                        onAddTerm={handleAddTerm}
                        onRemoveTerm={handleRemoveTerm}
                        onTermChange={handleTermChange}
                    />

                    <AssessmentSystem
                        formData={formData}
                        onFormDataChange={handleFormDataChange}
                    />
                </ProgramSubmission>
            </CardContent>
        </Card>
    );
};

const transformProgramToFormData = (program: any): ProgramFormData => {
    return {
        name: program.name,
        description: program.description || "",
        calendarId: program.calendarId,
        coordinatorId: program.coordinatorId || "NO_SELECTION",
        status: program.status as Status,
        termSystem: {
            type: program.termStructures?.[0]?.type || "SEMESTER",
            terms: program.termStructures?.map((term: any) => ({
                name: term.name,
                startDate: new Date(term.startDate),
                endDate: new Date(term.endDate),
                type: term.type,
                assessmentPeriods: term.assessmentPeriods || []
            })) || []
        },
        assessmentSystem: program.assessmentSystem || defaultFormData.assessmentSystem
    };
};

const validateForm = (formData: ProgramFormData): boolean => {
    if (!formData.name.trim()) {
        toast({
            title: "Validation Error",
            description: "Program name is required",
            variant: "destructive"
        });
        return false;
    }
    if (formData.calendarId === "NO_SELECTION") {
        toast({
            title: "Validation Error",
            description: "Please select a calendar",
            variant: "destructive"
        });
        return false;
    }
    return true;
};

const prepareSubmissionData = (formData: ProgramFormData) => {
    return {
        name: formData.name.trim(),
        description: formData.description?.trim(),
        calendarId: formData.calendarId,
        coordinatorId: formData.coordinatorId === "NO_SELECTION" ? 
            undefined : formData.coordinatorId,
        status: formData.status,
        termSystem: formData.termSystem,
        assessmentSystem: formData.assessmentSystem
    };
};