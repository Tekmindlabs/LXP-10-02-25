import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

export enum ActivityResourceType {
	DOCUMENT = 'DOCUMENT',
	VIDEO = 'VIDEO',
	AUDIO = 'AUDIO',
	LINK = 'LINK',
	IMAGE = 'IMAGE'
}

interface Resource {
	title: string;
	type: ActivityResourceType;
	url: string;
	fileInfo?: {
		size: number;
		createdAt: Date;
		updatedAt: Date;
		mimeType: string;
		publicUrl: string;
	};
}

interface ResourcesSectionProps {
	form: UseFormReturn<{
		resources?: Resource[];
		[key: string]: any;
	}>;
}

interface FileInfo {
	size: number;
	createdAt: Date;
	updatedAt: Date;
	mimeType: string;
	publicUrl: string;
}

export function ResourcesSection({ form }: ResourcesSectionProps) {
	const resources = form.watch('resources') || [];

	const handleAddResource = () => {
		const currentResources = form.getValues('resources') || [];
		form.setValue('resources', [
			...currentResources,
			{ title: '', type: ActivityResourceType.DOCUMENT, url: '' }
		]);
	};

	const handleRemoveResource = (index: number) => {
		const currentResources = form.getValues('resources') || [];
		form.setValue('resources', currentResources.filter((_: Resource, i: number) => i !== index));
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-medium">Resources</h3>
				<Button type="button" variant="outline" onClick={handleAddResource}>
					Add Resource
				</Button>
			</div>

			{resources.map((_: Resource, index: number) => (
				<div key={index} className="space-y-4 p-4 border rounded-md">
					<div className="flex justify-end">
						<Button
							type="button"
							variant="destructive"
							size="sm"
							onClick={() => handleRemoveResource(index)}
						>
							Remove
						</Button>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name={`resources.${index}.title`}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Title</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name={`resources.${index}.type`}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Type</FormLabel>
									<Select onValueChange={field.onChange} value={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select type" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{Object.values(ActivityResourceType).map((type) => (
												<SelectItem key={type} value={type}>
													{type}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<FormField
						control={form.control}
						name={`resources.${index}.url`}
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									{field.value ? 'URL/File' : 'Upload File or Enter URL'}
								</FormLabel>
								<FormControl>
									{field.value ? (
										<div className="flex gap-2">
											<Input {...field} />
											<Button
												type="button"
												variant="outline"
												onClick={() => field.onChange('')}
											>
												Clear
											</Button>
										</div>
									) : (
										<FileUpload
											onUploadComplete={(filePath: string, fileInfo: FileInfo) => {
												field.onChange(filePath);
												form.setValue(`resources.${index}.fileInfo`, {
													size: fileInfo.size,
													createdAt: fileInfo.createdAt,
													updatedAt: fileInfo.updatedAt,
													mimeType: fileInfo.mimeType,
													publicUrl: fileInfo.publicUrl
												});
											}}
											maxSize={10 * 1024 * 1024} // 10MB
											allowedTypes={['image/*', 'application/pdf', 'video/*', 'audio/*']}
										/>


									)}
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			))}
		</div>
	);
}