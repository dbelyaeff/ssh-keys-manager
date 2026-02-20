import { useState } from "react";
import { useKeysStore } from "@/store/keysStore";
import { generateKey } from "@/lib/tauri";
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
      toast.error("Укажите имя файла ключа");
      return;
    }
    setGenerating(true);
    const toastId = toast.loading("Генерирую ключ...");
    try {
      await generateKey({
        name: name.trim(),
        key_type: keyType,
        bits: availableBits.length > 0 ? bits : 0,
        comment,
        passphrase,
      });
      toast.dismiss(toastId);
      toast.success(`Ключ «${name.trim()}» создан`);
      await loadKeys();
      await selectKey(name.trim());
      onGenerated?.(name.trim());
      onOpenChange(false);
      setName("");
      setComment("");
      setPassphrase("");
    } catch (e) {
      toast.dismiss(toastId);
      toast.error(`Ошибка генерации: ${e}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новый SSH-ключ</DialogTitle>
          <DialogDescription>Сгенерировать пару ключей и сохранить в ~/.ssh/</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Имя файла</Label>
            <Input
              placeholder="id_ed25519_myserver"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Будет сохранён как ~/.ssh/{name || "имя_ключа"}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Тип ключа</Label>
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
                <Label>Длина ключа</Label>
                <Select value={String(bits)} onValueChange={(v) => setBits(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBits.map((b) => (
                      <SelectItem key={b} value={String(b)}>{b} бит</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Комментарий <span className="text-muted-foreground">(необязательно)</span></Label>
            <Input
              placeholder="user@hostname"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Пассфраза <span className="text-muted-foreground">(необязательно)</span></Label>
            <Input
              type="password"
              placeholder="Оставьте пустым для без пароля"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? "Генерирую..." : "Сгенерировать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
