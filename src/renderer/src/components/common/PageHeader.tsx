import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  logo?: string;
}

export function PageHeader({ title, description, action, logo }: PageHeaderProps) {
  return (
    <div className="page-header animate-fade-in">
      <div className="flex items-center gap-4">
        {logo ? (
          <img src={logo} className="h-12 w-auto object-contain" alt="logo" />
        ) : null}
        <div>
          <h1 className="page-title">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
