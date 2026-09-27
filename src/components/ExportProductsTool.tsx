'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileSpreadsheet, Database, ChevronDown, ChevronUp } from "lucide-react";
import { productsService } from "@/lib/firebase";
import { toast } from "sonner";
import Papa from "papaparse";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function ExportProductsTool() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "json" | "csv") => {
    try {
      setIsExporting(true);
      toast.loading("جاري جلب المنتجات...", { id: "export" });
      const products = await productsService.getAllProducts();

      if (!products.length) {
        toast.error("لا توجد منتجات لتصديرها", { id: "export" });
        return;
      }

      toast.loading("جاري تحضير الملف...", { id: "export" });

      let dataToDownload: string;
      let mimeType: string;
      let fileExtension: string;

      if (format === "json") {
        dataToDownload = JSON.stringify(products, null, 2);
        mimeType = "application/json";
        fileExtension = "json";
      } else {
        const csvData = products.map(p => {
            return {
                ...p,
                images: JSON.stringify(p.images || []),
                videoUrls: JSON.stringify(p.videoUrls || []),
                sizes: JSON.stringify(p.sizes || []),
                customOptionGroups: JSON.stringify(p.customOptionGroups || []),
                addons: JSON.stringify(p.addons || []),
                specifications: JSON.stringify(p.specifications || []),
                features: JSON.stringify(p.features || []),
                costs: JSON.stringify(p.costs || {}),
                wholesaleInfo: JSON.stringify(p.wholesaleInfo || {}),
                processor: JSON.stringify(p.processor || {}),
                dedicatedGraphics: JSON.stringify(p.dedicatedGraphics || {}),
                display: JSON.stringify(p.display || {})
            }
        });
        
        dataToDownload = Papa.unparse(csvData, { header: true });
        mimeType = "text/csv;charset=utf-8;";
        fileExtension = "csv";
      }

      const blob = new Blob([dataToDownload], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products_export_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`تم تصدير ${products.length} منتج بنجاح كملف ${format.toUpperCase()}`, { id: "export" });
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء تصدير المنتجات", { id: "export" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="bg-card rounded-lg border shadow-sm"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">تصدير المنتجات (Export)</h2>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="p-4 space-y-4 border-t">
          <p className="text-sm text-muted-foreground">
            قم بتصدير جميع منتجات المتجر كملف احتياطي (Backup). يمكنك اختيار التصدير بصيغة JSON (للحفاظ على التركيب كاملاً) أو CSV (للعرض في مجدولات البيانات).
          </p>
          <div className="flex gap-4">
            <Button 
                onClick={() => handleExport("json")} 
                disabled={isExporting} 
                className="flex-1 gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                variant="outline"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <FileJson className="w-5 h-5" />
              )}
              تصدير JSON
            </Button>
            <Button 
                onClick={() => handleExport("csv")} 
                disabled={isExporting} 
                className="flex-1 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                variant="outline"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <FileSpreadsheet className="w-5 h-5" />
              )}
              تصدير CSV
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
