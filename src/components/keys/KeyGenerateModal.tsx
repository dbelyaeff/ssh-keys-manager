import { useState } from "react";
import { useKeysStore } from "@/store/keysStore";
import { useSettingsStore } from "@/store/settingsStore";
import { generateKey } from "@/lib/tauri";
import { t } from "@/lib/i18n";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated?: (name: string) => void;
}

const KEY_BITS: Record<string, number[]> = {
  ed25519: [],
  rsa: [2048, 3072, 4096],
  ecdsa: [256, 384, 521],
  dsa: [1024],
};

export function KeyGenerateModal({ open, onOpenChange, onGenerated }: Props) {
  const { loadKeys, selectKey } = useKeysStore();
  const language = useSettingsStore((s) => s.language);
  const [name, setName] = useState("");
  const [keyType, setKeyType] = useState("ed25519");
  const [bits, setBits] = useState(4096);
  const [comment, setComment] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [generating, setGenerating] = useState(false);

  const availableBits = KEY_BITS[keyType] ?? [];

  const handleKeyTypeChange = (type: string) => {
    setKeyType(type);
    const b = KEY_BITS[type];
    if (b && b.length > 0) setBits(b[b.length - 1]);
  };

  const handleGenerate = async () => {
    if (!name.trim()) {
      toast.error(t(language, "keys.noNameError") || "Укажите имя файла ключа");
      return;
    }
    setGenerating(true);
    const toastId = toast.loading(t(language, "keys.generating"));
    try {
      await generateKey({
        name: name.trim(),
        key_type: keyType,
        bits: availableBits.length > 0 ? bits : 0,
        comment,
        passphrase,
      });
      toast.dismiss(toastId);
      toast.success(t(language, "keys.genSuccess", { name: name.trim() }));
      await loadKeys();
      await selectKey(name.trim());
      onGenerated?.(name.trim());
      onOpenChange(false);
      setName("");
      setComment("");
      setPassphrase("");
    } catch (e) {
      toast.dismiss(toastId);
      toast.error(`${t(language, "common.error")}: ${e}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(language, "keys.newKeyTitle")}</DialogTitle>
          <DialogDescription>{t(language, "keys.newKeyDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t(language, "keys.fileName")}</Label>
            <Input
              placeholder="id_ed25519_myserver"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t(language, "keys.fileHint", { name: name || "..." })}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t(language, "keys.keyType")}</Label>
              <Select value={keyType} onValueChange={handleKeyTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ed25519">ed25519</SelectItem>
                  <SelectItem value="rsa">RSA</SelectItem>
                  <SelectItem value="ecdsa">ECDSA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {availableBits.length > 0 && (
              <div className="space-y-1.5">
                <Label>{t(language, "keys.keyBits")}</Label>
                <Select value={String(bits)} onValueChange={(v) => setBits(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBits.map((b) => (
                      <SelectItem key={b} value={String(b)}>{t(language, "keys.bitsCount", { n: String(b) })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t(language, "keys.comment")} <span className="text-muted-foreground">({t(language, "common.optional")})</span></Label>
            <Input
              placeholder="user@hostname"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t(language, "keys.passphrase")} <span className="text-muted-foreground">({t(language, "common.optional")})</span></Label>
            <Input
              type="password"
              placeholder={t(language, "keys.passphraseHint")}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t(language, "common.cancel")}</Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? t(language, "keys.generating") : t(language, "keys.generate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
