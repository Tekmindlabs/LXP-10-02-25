import { gradingConfig } from '@/config/grading';

interface CacheEntry<T> {
	value: T;
	timestamp: number;
}

export class CacheManager {
	private cache: Map<string, CacheEntry<any>>;
	private readonly TTL: number;
	private readonly maxSize: number;

	constructor() {
		this.cache = new Map();
		this.TTL = gradingConfig.caching.ttl * 1000; // Convert to milliseconds
		this.maxSize = gradingConfig.caching.maxSize;
	}

	set<T>(key: string, value: T): void {
		if (this.cache.size >= this.maxSize) {
			// Remove oldest entry if cache is full
			const oldestKey = Array.from(this.cache.entries())
				.sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
			this.cache.delete(oldestKey);
		}

		this.cache.set(key, {
			value,
			timestamp: Date.now()
		});
	}

	get<T>(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		if (Date.now() - entry.timestamp > this.TTL) {
			this.cache.delete(key);
			return null;
		}

		return entry.value as T;
	}

	invalidate(key: string): void {
		this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	getSize(): number {
		return this.cache.size;
	}
}