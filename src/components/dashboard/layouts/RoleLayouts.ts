import { DefaultRoles, type Role } from "@/utils/permissions";
import { SystemMetrics } from "../SystemMetrics";
import { DashboardLayoutConfig } from "@/types/dashboard";

const components = {
	SystemMetrics,
} as const;

type ComponentType = typeof components;

export const RoleLayouts: Record<Role, DashboardLayoutConfig<keyof ComponentType>> = {
	"super-admin": {
		type: "complex",
		components: [
			{
				component: "SystemMetrics",
				gridArea: "metrics",
				className: "col-span-full"
			}
		]
	},
	"admin": {
		type: "simple",
		components: [
			{
				component: "SystemMetrics",
				gridArea: "metrics",
				className: "col-span-full"
			}
		]
	},
	"program_coordinator": {
		type: "simple",
		components: []
	},
	"teacher": {
		type: "simple",
		components: []
	},
	"student": {
		type: "simple",
		components: []
	},
	"parent": {
		type: "simple",
		components: []
	}
};

export const DashboardComponents = components;