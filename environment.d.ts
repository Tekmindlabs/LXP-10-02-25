/// <reference types="next" />
/// <reference types="next/navigation" />
/// <reference types="next/image-types/global" />

declare namespace NodeJS {
	interface ProcessEnv {
		NODE_ENV: 'development' | 'production' | 'test'
		DATABASE_URL: string
	}
}

declare module 'next' {
	export interface Metadata {
		title?: string
		description?: string
		[key: string]: any
	}
}

declare module 'next/font/google' {
	export interface GoogleFontOptions {
		subsets?: string[]
		display?: string
		weight?: string | number | Array<string | number>
		style?: string | string[]
	}

	export function Inter(options: GoogleFontOptions): {
		className: string
		style: { fontFamily: string }
	}
}

declare module 'next/headers' {
	export function headers(): Headers & {
		get(name: string): string | null
		has(name: string): boolean
		entries(): IterableIterator<[string, string]>
		keys(): IterableIterator<string>
		values(): IterableIterator<string>
		forEach(callback: (value: string, key: string) => void): void
	}

	export function cookies(): {
		get(name: string): { name: string; value: string } | undefined
		getAll(): Array<{ name: string; value: string }>
		set(name: string, value: string, options?: { path?: string; httpOnly?: boolean }): void
		delete(name: string): void
	}
}

declare module 'next/navigation' {
	export interface AppRouterInstance {
		push(href: string): void
		replace(href: string): void
		refresh(): void
		back(): void
		forward(): void
		prefetch(href: string): void
	}

	export function useRouter(): AppRouterInstance
	export function usePathname(): string
	export function useSearchParams(): URLSearchParams
}