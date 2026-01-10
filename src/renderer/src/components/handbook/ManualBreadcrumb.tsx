import React from 'react';
import { Home, Tag, FileText, Layers } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@renderer/components/ui/breadcrumb';

interface ManualBreadcrumbProps {
  brandName?: string;
  brandColor?: string;
  modelName?: string;
  componentCount?: number;
  onClickHome?: () => void;
  onClickBrand?: () => void;
  onClickModel?: () => void;
  currentPage?: 'modelos' | 'edicao' | 'visualizacao';
}

export const ManualBreadcrumb: React.FC<ManualBreadcrumbProps> = ({
  brandName,
  brandColor,
  modelName,
  componentCount,
  onClickHome,
  onClickBrand,
  onClickModel,
  currentPage = 'modelos'
}) => {
  const pageLabels = {
    modelos: 'Modelos',
    edicao: 'Edição',
    visualizacao: 'Visualização'
  };

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Home / Manual */}
        <BreadcrumbItem>
          <BreadcrumbLink 
            onClick={onClickHome}
            className="flex items-center gap-1.5 cursor-pointer hover:text-primary"
          >
            <Home className="w-4 h-4" />
            <span>Manual</span>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Marca */}
        {brandName && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {modelName ? (
                <BreadcrumbLink 
                  onClick={onClickBrand}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-primary"
                >
                  <Tag className="w-4 h-4" style={{ color: brandColor }} />
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    {brandName}
                  </span>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="flex items-center gap-1.5">
                  <Tag className="w-4 h-4" style={{ color: brandColor }} />
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    {brandName}
                  </span>
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}

        {/* Modelo */}
        {modelName && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {currentPage !== 'modelos' ? (
                <BreadcrumbLink 
                  onClick={onClickModel}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-primary"
                >
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">{modelName}</span>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">{modelName}</span>
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}

        {/* Página atual / Contador de componentes */}
        {modelName && currentPage !== 'modelos' && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>{pageLabels[currentPage]}</span>
                {componentCount !== undefined && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded-full font-semibold">
                    {componentCount}
                  </span>
                )}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
