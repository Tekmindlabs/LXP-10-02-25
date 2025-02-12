import { PrismaClient } from '@prisma/client';

interface CacheConfig {
	ttl: number;  // Time to live in seconds
	maxSize: number;  // Maximum cache entries
}

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

export class CacheManager {
	private cache: Map<string, CacheEntry<any>> = new Map();
	private config: CacheConfig = {
		ttl: 3600,  // 1 hour default
		maxSize: 1000
	};

	constructor(config?: Partial<CacheConfig>) {
		if (config) {
			this.config = { ...this.config, ...config };
		}
	}

	async get<T>(key: string): Promise<T | null> {
		const entry = this.cache.get(key);
		if (!entry) return null;

		if (this.isExpired(entry)) {
			this.cache.delete(key);
			return null;
		}

		return entry.data as T;
	}

	async set<T>(key: string, data: T): Promise<void> {
		if (this.cache.size >= this.config.maxSize) {
			this.evictOldest();
		}

		this.cache.set(key, {
			data,
			timestamp: Date.now()
		});
	}

	private isExpired(entry: CacheEntry<any>): boolean {
		const age = Date.now() - entry.timestamp;
		return age > this.config.ttl * 1000;
	}

	private evictOldest(): void {
		const oldest = Array.from(this.cache.entries())
			.reduce((a, b) => a[1].timestamp < b[1].timestamp ? a : b);
		this.cache.delete(oldest[0]);
	}

	async getOrSet<T>(
		key: string,
		fetchFn: () => Promise<T>
	): Promise<T> {
		const cached = await this.get<T>(key);
		if (cached) return cached;

		const data = await fetchFn();
		await this.set(key, data);
		return data;
	}

	clear(): void {
		this.cache.clear();
	}
}