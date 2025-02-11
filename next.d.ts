/// <reference types="next" />
/// <reference types="next/navigation" />
/// <reference types="next/image-types/global" />

declare module 'next' {
	import type { NextPage } from 'next'
	import type { AppProps } from 'next/app'
	
	export type { NextPage, AppProps }
	export type Metadata = {
		title?: string
		description?: string
		[key: string]: any
	}
}

declare module 'next/font/google' {
	export interface GoogleFontOptions {
		subsets?: string[]
		display?: string
		weight?: string | string[]
	}

	export function Inter(options: GoogleFontOptions): {
		className: string
		style: { fontFamily: string }
	}
}

declare module 'next/headers' {
	export function headers(): Headers
	export function cookies(): {
		get(name: string): { name: string; value: string } | undefined
		getAll(): Array<{ name: string; value: string }>
	}
}