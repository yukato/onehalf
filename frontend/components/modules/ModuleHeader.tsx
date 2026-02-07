'use client';

import { ModuleIcon } from '@/lib/module-icons';

interface ModuleHeaderProps {
  moduleName: string;
  companyName?: string;
  icon?: string;
  actions?: React.ReactNode;
}

export function ModuleHeader({ moduleName, companyName, icon, actions }: ModuleHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex items-center justify-center w-9 h-9 bg-primary/10 rounded-lg">
            <ModuleIcon icon={icon} className="w-[18px] h-[18px] text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{moduleName}</h1>
          {companyName && (
            <p className="text-sm text-gray-500">{companyName}</p>
          )}
        </div>
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}
