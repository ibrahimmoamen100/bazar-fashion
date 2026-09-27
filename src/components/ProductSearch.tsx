import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ProductSearch({ value, onChange, placeholder = "ابحث عن اسم المنتج..." }: ProductSearchProps) {
  return (
    <div className="relative w-full">
      <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground rtl:left-3 rtl:right-auto" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-9 pl-4 rtl:pl-9 rtl:pr-4 w-full"
      />
    </div>
  );
}
