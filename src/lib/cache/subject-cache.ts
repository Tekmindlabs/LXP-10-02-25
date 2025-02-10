import { Subject } from '@prisma/client';

class SubjectCache {
	private cache: Map<string, Subject> = new Map();
	private static instance: SubjectCache;

	private constructor() {}

	static getInstance(): SubjectCache {
		if (!SubjectCache.instance) {
			SubjectCache.instance = new SubjectCache();
		}
		return SubjectCache.instance;
	}

	set(subjectId: string, subject: Subject): void {
		this.cache.set(subjectId, subject);
	}

	get(subjectId: string): Subject | undefined {
		return this.cache.get(subjectId);
	}

	invalidate(subjectId: string): void {
		this.cache.delete(subjectId);
	}

	clear(): void {
		this.cache.clear();
	}
}

export const subjectCache = SubjectCache.getInstance();