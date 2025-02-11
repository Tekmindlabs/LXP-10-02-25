/// <reference types="next" />
/// <reference types="next/navigation" />
/// <reference types="next/image-types/global" />

import type { Metadata as NextMetadata } from 'next';
import type { Inter as NextInter } from 'next/font/google';
import type { headers as NextHeaders } from 'next/headers';

declare global {
	declare module 'next' {
		export type Metadata = NextMetadata;
	}

	declare module 'next/font/google' {
		export const Inter: typeof NextInter;
	}

	declare module 'next/headers' {
		export const headers: typeof NextHeaders;
	}
}

export {};