import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type React from "react";
import type { DevLogEntry, DevLogType } from "../types";

const LOG_ICONS: Record<DevLogType, React.ReactNode> = {
	info: <Info size={12} className="text-foreground-muted" />,
	success: <CheckCircle2 size={12} className="text-status-success" />,
	error: <AlertCircle size={12} className="text-destructive" />,
};

export function LogsTab({ logs }: { logs: DevLogEntry[] }) {
	return (
		<div className="flex flex-col h-full">
			<div className="p-4 border-b border-glass-border-base flex items-center justify-between bg-glass-bg-base/30">
				<h2 className="text-sm font-semibold">System Logs</h2>
				<span className="text-[10px] uppercase tracking-wider text-foreground-subtle">
					{logs.length} entries
				</span>
			</div>
			<div className="flex-1 p-2 overflow-y-auto font-mono text-xs">
				{logs.map((log) => (
					<div
						key={log.id}
						className="flex items-start gap-3 py-1.5 px-2 hover:bg-glass-bg-hover/50 rounded transition-colors group"
					>
						<span className="text-foreground-muted/50 shrink-0 mt-0.5">
							{log.time}
						</span>
						<div className="mt-0.5 shrink-0">{LOG_ICONS[log.type]}</div>
						<span
							className={`break-all ${log.type === "error" ? "text-destructive" : "text-foreground-subtle group-hover:text-foreground"}`}
						>
							{log.message}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
