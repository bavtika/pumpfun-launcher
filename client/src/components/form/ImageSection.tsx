import { useRef, useState } from "react";
import { useFormStore } from "../../stores/form";
import { toast } from "../../stores/toast";
import { fieldLabelCls, inputCls, textareaCls } from "../../lib/styles";
import type { ImageTab } from "../../api/types";

const TABS: { key: ImageTab; label: string; icon: React.ReactNode }[] = [
  {
    key: "upload",
    label: "Upload",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M6.5 9V3M6.5 3L4 5.5M6.5 3L9 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M1.5 10.5H11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "web",
    label: "Web",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6.5 1.5C6.5 1.5 5 4 5 6.5s1.5 5 1.5 5M6.5 1.5C6.5 1.5 8 4 8 6.5s-1.5 5-1.5 5M1.5 6.5h10" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    key: "ascii",
    label: "ASCII",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <path d="M2 3h9M2 6.5h9M2 10h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function ImageSection() {
  const imageTab = useFormStore((s) => s.imageTab);
  const setField = useFormStore((s) => s.setField);
  const setImageFile = useFormStore((s) => s.setImageFile);
  const webImageUrl = useFormStore((s) => s.webImageUrl);
  const asciiArt = useFormStore((s) => s.asciiArt);
  const imagePreviewUrl = useFormStore((s) => s.imagePreviewUrl);
  const confirmedUrl = useFormStore((s) => s.imageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const previewSrc = imagePreviewUrl ?? confirmedUrl;
  const hasImage = Boolean(previewSrc);

  const loadFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    useFormStore.setState({ imageUrl: null });
  };

  const loadWebImage = () => {
    const url = webImageUrl.trim();
    if (!url) {
      toast("Enter an image URL", "error");
      return;
    }
    setImageFile(null);
    useFormStore.setState({ imageUrl: url });
    toast("Image loaded ✓", "success");
  };

  return (
    <div>
      <div className={fieldLabelCls}>Image / GIF</div>
      <div className="flex flex-col gap-2">
        {imageTab === "upload" && (
          <div
            className={`relative h-[120px] rounded-md border border-dashed flex items-center justify-center cursor-pointer transition-colors overflow-hidden ${
              dragOver
                ? "border-accent/60 bg-accent/5"
                : hasImage
                  ? "border-[#4ade8050] bg-card"
                  : "border-line bg-card hover:border-line-focus"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              loadFile(e.dataTransfer.files?.[0]);
            }}
          >
            {previewSrc ? (
              <img src={previewSrc} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="text-dim">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 16V8M12 8L9 11M12 8L15 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 16.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,image/gif"
              className="hidden"
              onChange={(e) => loadFile(e.target.files?.[0])}
            />
          </div>
        )}

        <div className="flex gap-1 bg-card border border-line rounded-sm p-0.5 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setField("imageTab", t.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] transition-colors ${
                imageTab === t.key ? "bg-hover text-primary" : "text-dim hover:text-muted"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {imageTab === "web" && (
          <div className="flex gap-2">
            <input
              type="url"
              value={webImageUrl}
              onChange={(e) => setField("webImageUrl", e.target.value)}
              className={inputCls}
              placeholder="https://example.com/image.png"
            />
            <button
              onClick={loadWebImage}
              className="h-8 px-3 shrink-0 rounded-sm border border-line bg-white/[0.04] text-xs text-muted hover:text-primary hover:bg-hover transition-colors"
            >
              Load
            </button>
          </div>
        )}
        {imageTab === "web" && previewSrc && (
          <div className="relative h-[120px] rounded-md border border-[#4ade8050] bg-card overflow-hidden">
            <img src={previewSrc} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}

        {imageTab === "ascii" && (
          <textarea
            value={asciiArt}
            onChange={(e) => setField("asciiArt", e.target.value)}
            className={`${textareaCls} font-mono`}
            placeholder="Paste ASCII art here..."
            rows={5}
          />
        )}
      </div>
    </div>
  );
}
