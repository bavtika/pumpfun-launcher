import { useEffect, useRef, useState } from "react";
import { useFormStore } from "../../stores/form";
import { toast } from "../../stores/toast";
import { fieldLabelCls, inputCls, textareaCls } from "../../lib/styles";
import type { ImageTab } from "../../api/types";
import type { AsciiFontId } from "../../lib/asciiArt";

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

const FG_PRESETS = ["#fafafa", "#00FFA3", "#DC1FFF", "#ffd60a", "#64d2ff", "#ff453a"];
const BG_PRESETS = ["#0a0a0a", "#101018", "#001a12", "#1a0024", "#001428", "#1a0505"];

const FONT_OPTIONS: { id: AsciiFontId; label: string }[] = [
  { id: "Standard", label: "Standard" },
  { id: "Slant", label: "Slant" },
  { id: "Big", label: "Big" },
  { id: "Small", label: "Small" },
  { id: "Doom", label: "Doom" },
  { id: "ANSI Shadow", label: "ANSI Shadow" },
  { id: "Block", label: "Block" },
  { id: "Banner", label: "Banner" },
  { id: "3D-ASCII", label: "3D ASCII" },
  { id: "Larry 3D", label: "Larry 3D" },
  { id: "Speed", label: "Speed" },
  { id: "Bloody", label: "Bloody" },
];

function AsciiGenerator() {
  const asciiText = useFormStore((s) => s.asciiText);
  const asciiFont = useFormStore((s) => s.asciiFont);
  const asciiArt = useFormStore((s) => s.asciiArt);
  const asciiFg = useFormStore((s) => s.asciiFg);
  const asciiBg = useFormStore((s) => s.asciiBg);
  const name = useFormStore((s) => s.name);
  const ticker = useFormStore((s) => s.ticker);
  const setField = useFormStore((s) => s.setField);
  const setImageFile = useFormStore((s) => s.setImageFile);

  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const previewRef = useRef<string | null>(null);

  const applyArt = async (text: string, font: AsciiFontId) => {
    setBusy(true);
    try {
      const { generateAsciiArt } = await import("../../lib/asciiArt");
      const art = generateAsciiArt(text, font);
      setField("asciiArt", art);
      setImageFile(null);
      useFormStore.setState({ imageUrl: null });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!asciiText.trim()) {
      setField("asciiArt", "");
      return;
    }
    const t = window.setTimeout(() => {
      void applyArt(asciiText, asciiFont);
    }, 140);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asciiText, asciiFont]);

  useEffect(() => {
    let cancelled = false;
    if (!asciiArt.trim()) {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setPreview(null);
      return;
    }
    void import("../../lib/asciiArt").then(({ asciiPreviewUrl }) =>
      asciiPreviewUrl(asciiArt, { fg: asciiFg, bg: asciiBg, size: 512 }).then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = url;
        setPreview(url);
      })
    );
    return () => {
      cancelled = true;
    };
  }, [asciiArt, asciiFg, asciiBg]);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const fillFrom = (src: "ticker" | "name") => {
    const v = (src === "ticker" ? ticker : name).trim();
    if (!v) {
      toast(src === "ticker" ? "Ticker is empty" : "Name is empty", "error");
      return;
    }
    setField("asciiText", v);
  };

  const copyArt = async () => {
    if (!asciiArt.trim()) return;
    try {
      await navigator.clipboard.writeText(asciiArt);
      toast("ASCII copied ✓", "success");
    } catch {
      toast("Copy failed", "error");
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-2">
        <input
          type="text"
          value={asciiText}
          onChange={(e) => setField("asciiText", e.target.value.slice(0, 24))}
          className={inputCls}
          placeholder="Text to render…"
          maxLength={24}
          spellCheck={false}
        />
        <select
          value={asciiFont}
          onChange={(e) => setField("asciiFont", e.target.value as AsciiFontId)}
          className={`${inputCls} !w-[148px] shrink-0 cursor-pointer`}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => fillFrom("ticker")}
          className="h-7 px-2.5 rounded-sm border border-line bg-white/[0.03] text-[11px] text-muted hover:text-primary hover:bg-hover transition-colors"
        >
          Use ticker
        </button>
        <button
          type="button"
          onClick={() => fillFrom("name")}
          className="h-7 px-2.5 rounded-sm border border-line bg-white/[0.03] text-[11px] text-muted hover:text-primary hover:bg-hover transition-colors"
        >
          Use name
        </button>
        <button
          type="button"
          onClick={() => void copyArt()}
          disabled={!asciiArt.trim()}
          className="h-7 px-2.5 rounded-sm border border-line bg-white/[0.03] text-[11px] text-muted hover:text-primary hover:bg-hover transition-colors disabled:opacity-40"
        >
          Copy art
        </button>
        <span className="ml-auto self-center text-[10px] font-mono text-dim">
          {busy ? "…" : `${asciiText.length}/24`}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-dim">Foreground</div>
        <div className="flex items-center gap-1.5">
          {FG_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => setField("asciiFg", c)}
              className={`w-6 h-6 rounded-full border transition-transform ${
                asciiFg === c ? "border-primary scale-110" : "border-line hover:scale-105"
              }`}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={asciiFg}
            onChange={(e) => setField("asciiFg", e.target.value)}
            className="w-7 h-7 rounded-sm border border-line bg-transparent cursor-pointer"
            title="Custom foreground"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-dim">Background</div>
        <div className="flex items-center gap-1.5">
          {BG_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => setField("asciiBg", c)}
              className={`w-6 h-6 rounded-full border transition-transform ${
                asciiBg === c ? "border-primary scale-110" : "border-line hover:scale-105"
              }`}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            value={asciiBg}
            onChange={(e) => setField("asciiBg", e.target.value)}
            className="w-7 h-7 rounded-sm border border-line bg-transparent cursor-pointer"
            title="Custom background"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-2 items-stretch">
        <textarea
          value={asciiArt}
          onChange={(e) => {
            setField("asciiArt", e.target.value);
            setImageFile(null);
            useFormStore.setState({ imageUrl: null });
          }}
          className={`${textareaCls} font-mono text-[10px] leading-tight min-h-[160px]`}
          placeholder="ASCII preview — type above or paste custom art…"
          spellCheck={false}
        />
        <div
          className="relative size-[160px] shrink-0 mx-auto sm:mx-0 rounded-md border border-line overflow-hidden bg-card"
          style={{ background: asciiBg }}
        >
          {preview ? (
            <img src={preview} alt="ASCII preview" className="absolute inset-0 size-full object-contain" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-dim px-2 text-center">
              PNG preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Fixed 200×200 frame — avoids full-width thin strips from height-only boxes. */
function SquarePreview({
  src,
  empty,
  interactive,
  dragOver,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  src: string | null;
  empty?: React.ReactNode;
  interactive?: boolean;
  dragOver?: boolean;
  onClick?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const border = dragOver
    ? "border-accent/60 bg-accent/5"
    : src
      ? "border-[#4ade8050] bg-card"
      : interactive
        ? "border-dashed border-line bg-card hover:border-line-focus"
        : "border-line bg-card";

  return (
    <div
      className={`relative size-[200px] shrink-0 rounded-md border overflow-hidden flex items-center justify-center transition-colors ${border} ${
        interactive ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {src ? (
        <img
          src={src}
          alt="Preview"
          className="absolute inset-0 size-full object-contain bg-black/40"
        />
      ) : (
        empty
      )}
    </div>
  );
}

export function ImageSection() {
  const imageTab = useFormStore((s) => s.imageTab);
  const setField = useFormStore((s) => s.setField);
  const setImageFile = useFormStore((s) => s.setImageFile);
  const webImageUrl = useFormStore((s) => s.webImageUrl);
  const imagePreviewUrl = useFormStore((s) => s.imagePreviewUrl);
  const confirmedUrl = useFormStore((s) => s.imageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const previewSrc = imagePreviewUrl ?? confirmedUrl;

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

  const showUploadFrame = imageTab === "upload";
  const showWebFrame = imageTab === "web" && Boolean(previewSrc);

  return (
    <div>
      <div className={fieldLabelCls}>Image / GIF</div>
      <div className="flex flex-col gap-2">
        {showUploadFrame && (
          <>
            <SquarePreview
              src={previewSrc}
              interactive
              dragOver={dragOver}
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
              empty={
                <div className="flex flex-col items-center gap-1.5 text-dim px-3 text-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 16V8M12 8L9 11M12 8L15 11"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M20 16.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-[10px]">Drop image / GIF</span>
                </div>
              }
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,image/gif"
              className="hidden"
              onChange={(e) => loadFile(e.target.files?.[0])}
            />
          </>
        )}

        <div className="flex gap-1 bg-card border border-line rounded-sm p-0.5 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
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
              type="button"
              onClick={loadWebImage}
              className="h-8 px-3 shrink-0 rounded-sm border border-line bg-white/[0.04] text-xs text-muted hover:text-primary hover:bg-hover transition-colors"
            >
              Load
            </button>
          </div>
        )}
        {showWebFrame && <SquarePreview src={previewSrc} />}

        {imageTab === "ascii" && <AsciiGenerator />}
      </div>
    </div>
  );
}
