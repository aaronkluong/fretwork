import { useState, useRef, useEffect } from "react";

export interface DropdownOption<T = string | number> {
  value: T;
  label: string;
  group?: string;
  badge?: string;
}

interface CustomDropdownProps<T = string | number> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (val: T) => void;
  allowHoverExpand?: boolean;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}

export function CustomDropdown<T extends string | number>({
  options,
  value,
  onChange,
  allowHoverExpand = false,
  placeholder = "Select...",
  className = "",
  buttonClassName = "",
  disabled = false,
}: CustomDropdownProps<T>) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (!allowHoverExpand) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (!allowHoverExpand) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPinned(false);
        setIsHovered(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isExpanded = !disabled && ( (allowHoverExpand && isHovered) || isPinned );
  const selectedOption = options.find((o) => o.value === value);

  // Group options if group prop exists
  const groupedOptions = options.reduce<Record<string, DropdownOption<T>[]>>((acc, option) => {
    const key = option.group || "__ungrouped__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(option);
    return acc;
  }, {});

  const groupKeys = Object.keys(groupedOptions);

  return (
    <div
      ref={dropdownRef}
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsPinned((prev) => !prev)}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-bold shadow-sm transition-all duration-200 outline-none ${
          disabled
            ? "cursor-not-allowed opacity-50 border-slate-200 bg-slate-100 dark:border-white/5 dark:bg-surface"
            : isExpanded
            ? "border-primary bg-primary/10 text-primary dark:border-primary dark:bg-primary/20"
            : "border-slate-200/80 bg-white text-slate-700 hover:border-primary dark:border-white/10 dark:bg-surface dark:text-slate-200"
        } ${buttonClassName}`}
        title={allowHoverExpand ? "Hover to preview options or click to lock/unlock dropdown" : "Click to select"}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180 text-primary" : "opacity-60"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="absolute left-0 right-0 top-full z-50 pt-1">
          <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200/80 bg-white py-1 shadow-xl animate-in fade-in zoom-in-95 dark:border-white/15 dark:bg-surface dark:shadow-black/60 custom-scrollbar">
            {groupKeys.map((groupKey) => (
              <div key={groupKey}>
                {groupKey !== "__ungrouped__" && (
                  <div className="sticky top-0 z-10 bg-slate-100/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-surface/90 dark:text-slate-400">
                    {groupKey}
                  </div>
                )}
                {groupedOptions[groupKey].map((opt) => {
                  const isActive = opt.value === value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setIsPinned(false);
                        setIsHovered(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-xs transition-colors ${
                        isActive
                          ? "bg-primary/10 font-bold text-primary dark:bg-primary/20"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-accent-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {isActive && (
                        <svg className="h-3.5 w-3.5 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
