import { cn } from "@renderer/lib/utils"
import { Loader2 } from 'lucide-react'

function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("animate-pulse rounded-md bg-muted", className)}
			{...props}
		/>
	)
}

// Skeleton para card de modelo
function ModelCardSkeleton() {
	return (
		<div className="bg-card rounded-xl border-2 border-border p-5">
			<Skeleton className="h-6 w-3/4 mb-3" />
			<div className="space-y-2 mb-4">
				<div className="flex justify-between">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-16" />
				</div>
				<div className="flex justify-between">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-24" />
				</div>
				<div className="flex justify-between">
					<Skeleton className="h-4 w-14" />
					<Skeleton className="h-4 w-20" />
				</div>
			</div>
			<div className="flex gap-1 mb-4">
				{[1, 2, 3, 4, 5, 6].map(i => (
					<Skeleton key={i} className="h-6 w-8" />
				))}
			</div>
			<div className="flex gap-2 pt-3 border-t border-border">
				<Skeleton className="h-9 flex-1" />
				<Skeleton className="h-9 flex-1" />
			</div>
		</div>
	)
}

// Skeleton para grid de modelos
function ModelGridSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{Array.from({ length: count }).map((_, i) => (
				<ModelCardSkeleton key={i} />
			))}
		</div>
	)
}

// Skeleton para card de componente
function ComponentCardSkeleton() {
	return (
		<div className="bg-card rounded-lg border border-border p-3">
			<Skeleton className="h-5 w-full mb-2" />
			<Skeleton className="h-4 w-3/4 mb-2" />
			<Skeleton className="h-24 w-full mb-2" />
			<div className="flex gap-2">
				<Skeleton className="h-6 w-16" />
				<Skeleton className="h-6 w-20" />
			</div>
		</div>
	)
}

// Skeleton para grid de componentes
function ComponentGridSkeleton({ columns = 4, rows = 3 }: { columns?: number; rows?: number }) {
	return (
		<div 
			className="grid gap-4 p-6"
			style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
		>
			{Array.from({ length: columns * rows }).map((_, i) => (
				<ComponentCardSkeleton key={i} />
			))}
		</div>
	)
}

// Spinner de loading
function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
	const sizeClass = {
		sm: 'w-4 h-4',
		md: 'w-6 h-6',
		lg: 'w-8 h-8'
	}

	return (
		<Loader2 className={cn("animate-spin text-primary", sizeClass[size], className)} />
	)
}

// Loading overlay
function LoadingOverlay({ message = 'Carregando...' }: { message?: string }) {
	return (
		<div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
			<div className="flex flex-col items-center gap-3">
				<Spinner size="lg" />
				<span className="text-sm text-muted-foreground">{message}</span>
			</div>
		</div>
	)
}

// Loading para página inteira
function PageLoading({ message = 'Carregando...' }: { message?: string }) {
	return (
		<div className="flex-1 flex items-center justify-center">
			<div className="flex flex-col items-center gap-3">
				<Spinner size="lg" />
				<span className="text-muted-foreground">{message}</span>
			</div>
		</div>
	)
}

export { 
	Skeleton, 
	ModelCardSkeleton, 
	ModelGridSkeleton, 
	ComponentCardSkeleton, 
	ComponentGridSkeleton,
	Spinner,
	LoadingOverlay,
	PageLoading
}
