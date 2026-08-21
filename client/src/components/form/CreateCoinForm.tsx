import { useMemo, useRef, useState } from "react";
import bs58 from "bs58";
import { useFormStore, NAME_MAX, TICKER_MAX, DESC_MAX } from "../../stores/form";
import { useDeployFlow } from "../../hooks/useDeployFlow";
import { ImageSection } from "./ImageSection";
import { OptionsGrid } from "./OptionsGrid";
import { SnipePanel } from "./SnipePanel";
import { AmountPicker } from "./AmountPicker";
import { Toggle } from "../ui/Toggle";
import { inputCls, textareaCls, fieldLabelCls } from "../../lib/styles";
import { toast } from "../../stores/toast";
import { truncateAddress } from "../../lib/format";
import {
  startVanity,
  validateVanityPattern,
  expectedAttempts,
  fmtDuration,
  VANITY_MAX_LEN,
  type VanityJob,
  type VanityMatch,
  type VanityProgress,
} from "../../lib/vanity";

function CharCount({ len, max }: { len: number; max: number }) {
  return (
    <span className={`text-[10px] font-mono ${len >= max ? "text-danger" : "text-dim"}`}>
      {len}/{max}
    </span>
  );
}

export function CreateCoinForm() {
  const name = useFormStore((s) => s.name);
  const ticker = useFormStore((s) => s.ticker);
  const description = useFormStore((s) => s.description);
  const twitter = useFormStore((s) => s.twitter);
  const telegram = useFormStore((s) => s.telegram);
  const website = useFormStore((s) => s.website);
  const customCAEnabled = useFormStore((s) => s.customCAEnabled);
  const customCASecret = useFormStore((s) => s.customCASecret);
  const options = useFormStore((s) => s.options);
  const setField = useFormStore((s) => s.setField);

  const { deployIntent } = useDeployFlow();

  const [vanityPattern, setVanityPattern] = useState("");
  const [vanityMatch, setVanityMatch] = useState<VanityMatch>("prefix");
  const [vanityRunning, setVanityRunning] = useState(false);
  const [vanityProg, setVanityProg] = useState<VanityProgress | null>(null);
  const vanityJobRef = useRef<VanityJob | null>(null);

  const derivedCA = useMemo(() => {
    const sk = customCASecret.trim();
    if (!sk) return null;
    try {
      const bytes = bs58.decode(sk);
      return bytes.length === 64 ? bs58.encode(bytes.slice(32)) : null;
    } catch {
      return null;
    }
  }, [customCASecret]);

  const vanityPatternError = vanityPattern ? validateVanityPattern(vanityPattern) : null;

  const generateVanity = () => {
    const err = validateVanityPattern(vanityPattern);
    if (err) {
      toast(err, "error");
      return;
    }
    setVanityRunning(true);
    setVanityProg(null);
    const job = startVanity(vanityPattern, vanityMatch, setVanityProg);
    vanityJobRef.current = job;
    job.promise
      .then((r) => {
        setField("customCASecret", r.secretKey);
        toast(`✓ Vanity CA: ${truncateAddress(r.address)}`, "success");
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Vanity generation failed";
        if (msg !== "Cancelled") toast(msg, "error");
      })
      .finally(() => {
        setVanityRunning(false);
        setVanityProg(null);
        vanityJobRef.current = null;
      });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3.5">
        {/* Name + Ticker */}
        <div className="flex gap-2.5">
          <div className="flex-[2]">
            <div className={fieldLabelCls}>
              <span>Name</span>
              <CharCount len={name.length} max={NAME_MAX} />
            </div>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setField("name", e.target.value)}
                maxLength={NAME_MAX}
                placeholder="Coin Name"
                autoComplete="off"
                className={`${inputCls} !pr-8`}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-dim pointer-events-none">
                Aa
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className={fieldLabelCls}>
              <span>Ticker</span>
              <CharCount len={ticker.length} max={TICKER_MAX} />
            </div>
            <div className="relative">
              <input
                type="text"
                value={ticker}
                onChange={(e) => setField("ticker", e.target.value)}
                maxLength={TICKER_MAX}
                placeholder="MEME"
                autoComplete="off"
                className={`${inputCls} !pr-7 italic`}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-dim italic pointer-events-none">
                I
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div className={fieldLabelCls}>
            <span>
              Description <span className="text-dim">(optional)</span>
            </span>
            <CharCount len={description.length} max={DESC_MAX} />
          </div>
          <textarea
            value={description}
            onChange={(e) => setField("description", e.target.value)}
            maxLength={DESC_MAX}
            rows={3}
            placeholder="Coin Description"
            className={textareaCls}
          />
        </div>

        <ImageSection />

        {/* Social */}
        <div>
          <div className={fieldLabelCls}>
            <span>
              Social <span className="text-dim">(optional)</span>
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1.5L5.5 7.5L1 13h1.5L6 8.5l3.5 4.5H13L8.5 6.5 13 1h-1.5L7.5 5.5 4.5 1.5H1Z" fill="currentColor" />
              </svg>
              <input
                type="url"
                value={twitter}
                onChange={(e) => setField("twitter", e.target.value)}
                placeholder="X (Twitter) URL"
                autoComplete="off"
                className={`${inputCls} !pl-8`}
              />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1C3.686 1 1 3.463 1 6.5c0 1.55.672 2.95 1.75 3.96L2 13l2.62-1.31A6.5 6.5 0 0 0 7 12c3.314 0 6-2.463 6-5.5S10.314 1 7 1Z" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4.5 6.5h5M4.5 8.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <input
                  type="url"
                  value={telegram}
                  onChange={(e) => setField("telegram", e.target.value)}
                  placeholder="Telegram"
                  autoComplete="off"
                  className={`${inputCls} !pl-8`}
                />
              </div>
              <div className="relative flex-1">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M7 1.5C7 1.5 5.5 4 5.5 7s1.5 5.5 1.5 5.5M7 1.5C7 1.5 8.5 4 8.5 7S7 12.5 7 12.5M1.5 7h11" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setField("website", e.target.value)}
                  placeholder="Website"
                  autoComplete="off"
                  className={`${inputCls} !pl-8`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Custom CA (vanity) */}
        <div>
          <div className={fieldLabelCls}>
            <span>
              Custom CA <span className="text-dim">(vanity, optional)</span>
            </span>
            <Toggle checked={customCAEnabled} onChange={(v) => setField("customCAEnabled", v)} />
          </div>
          {customCAEnabled && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={vanityPattern}
                  onChange={(e) => setVanityPattern(e.target.value.trim())}
                  maxLength={VANITY_MAX_LEN}
                  placeholder="Pattern, e.g. pump"
                  autoComplete="off"
                  disabled={vanityRunning}
                  spellCheck={false}
                  className={`${inputCls} flex-1 !h-8 font-mono ${
                    vanityPatternError ? "!border-danger" : ""
                  }`}
                />
                <div className="flex rounded-sm overflow-hidden border border-line shrink-0">
                  {(["prefix", "suffix"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={vanityRunning}
                      onClick={() => setVanityMatch(m)}
                      className={`h-8 px-2.5 text-[11px] transition-colors cursor-pointer disabled:opacity-35 ${
                        vanityMatch === m
                          ? "bg-white/[0.12] text-primary"
                          : "text-dim hover:text-primary"
                      }`}
                    >
                      {m === "prefix" ? "Start" : "End"}
                    </button>
                  ))}
                </div>
                {vanityRunning ? (
                  <button
                    type="button"
                    onClick={() => vanityJobRef.current?.cancel()}
                    className="h-8 px-3 rounded-sm text-[11px] font-medium bg-danger/15 text-danger hover:bg-danger/25 transition-colors cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={generateVanity}
                    disabled={!vanityPattern || Boolean(vanityPatternError)}
                    className="h-8 px-3 rounded-sm text-[11px] font-medium bg-primary text-black hover:bg-white/85 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed shrink-0"
                  >
                    Generate
                  </button>
                )}
              </div>

              {vanityPatternError && (
                <div className="text-[10.5px] text-danger -mt-0.5">{vanityPatternError}</div>
              )}

              {vanityRunning && vanityProg && (
                <div className="text-[10.5px] font-mono text-dim leading-relaxed">
                  {vanityProg.mode === "cpu" ? (
                    <>
                      CPU ×{Math.max(1, Math.min(16, navigator.hardwareConcurrency || 4))} ·{" "}
                      {vanityProg.attempts.toLocaleString()} tried ·{" "}
                      {(vanityProg.rate / 1000).toFixed(0)}k keys/s ·{" "}
                      {fmtDuration(vanityProg.elapsedMs)}
                      {vanityProg.rate > 0 && (
                        <>
                          {" "}
                          · ETA ~
                          {fmtDuration((expectedAttempts(vanityPattern.length) / vanityProg.rate) * 1000)}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      GPU (RunPod) ·{" "}
                      {vanityProg.status === "IN_QUEUE" ? "in queue" : "generating"} ·{" "}
                      {fmtDuration(vanityProg.elapsedMs)}
                    </>
                  )}
                </div>
              )}

              <div className="text-[10px] text-dim -mt-0.5">
                1–3 chars grind on your CPU, 4–6 on GPU (RunPod). Base58 only — no 0, O, I, l.
                {options.multideploy && (
                  <> With multideploy, this CA is used only for the wallet selected in the header.</>
                )}
              </div>

              <input
                type="text"
                value={customCASecret}
                onChange={(e) => setField("customCASecret", e.target.value)}
                placeholder="Mint Keypair Secret Key (Base58)"
                autoComplete="off"
                className={`${inputCls} font-mono`}
              />
              {derivedCA ? (
                <div className="text-[10.5px] font-mono text-success break-all">✓ CA: {derivedCA}</div>
              ) : (
                customCASecret.trim() && (
                  <div className="text-[10.5px] text-danger">Invalid keypair — expected 64-byte Base58 secret</div>
                )
              )}
            </div>
          )}
        </div>

        <OptionsGrid />

        {options.snipe && <SnipePanel />}

        <AmountPicker />
      </div>

      {/* Deploy footer */}
      <div className="p-3 border-t border-line bg-white/[0.015]">
        <button
          onClick={deployIntent}
          className="w-full h-11 rounded-md bg-primary text-black text-[13.5px] font-semibold flex items-center justify-center gap-2 hover:bg-white/85 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M8 2C8 2 5.5 4 4.5 7L7 9.5C10 8.5 12 6 12 6L8 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M4.5 7L2.5 9M7 9.5L5 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="8.5" cy="5.5" r="1" fill="currentColor" />
          </svg>
          Deploy
        </button>
      </div>
    </div>
  );
}
