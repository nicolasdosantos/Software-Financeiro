import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";
import { Upload, AlertTriangle } from "lucide-react";
import { useFinance, formatCurrency, toLocalDate } from "../context/FinanceContext";
import {
  parseOfx, parseCsv, guessColumnMapping, buildTransactionsFromCsv,
} from "../../lib/importParsers";
import type { ParsedTransaction, CsvColumnMapping, ParsedCsv } from "../../lib/importParsers";
import { Modal } from "./shared/Modal";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface ImportTransactionsModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = "upload" | "mapping" | "preview";

interface PreviewRow extends ParsedTransaction {
  categoryId: string;
  include: boolean;
  isDuplicate: boolean;
}

const MAPPING_FIELDS: { key: keyof CsvColumnMapping; label: string }[] = [
  { key: "dateCol", label: "Data" },
  { key: "descCol", label: "Descrição" },
  { key: "amountCol", label: "Valor" },
];

/**
 * Importa um extrato de banco/cartão (CSV ou OFX) e transforma em
 * transações reais, em vez de exigir digitar uma por uma. OFX (o padrão
 * aberto que praticamente todo banco brasileiro oferece pra exportar) é
 * reconhecido e lido automaticamente, sem precisar de nenhuma configuração —
 * CSV varia demais de banco pra banco, então pede pra confirmar/corrigir
 * qual coluna é qual antes de importar (com um palpite já preenchido).
 * Antes de importar de fato, mostra uma prévia de tudo — com categoria e
 * tipo editáveis por linha, e possíveis duplicatas (mesma data/tipo/valor de
 * algo que já existe) já desmarcadas por padrão, mas incluíveis se o usuário
 * quiser mesmo assim.
 */
export function ImportTransactionsModal({ open, onClose }: ImportTransactionsModalProps) {
  const { categories, transactions, addTransactionsBulk } = useFinance();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [csvData, setCsvData] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<CsvColumnMapping>({ dateCol: -1, descCol: -1, amountCol: -1 });
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);

  function reset() {
    setStep("upload");
    setFileName("");
    setCsvData(null);
    setMapping({ dateCol: -1, descCol: -1, amountCol: -1 });
    setPreviewRows([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function isDuplicateOf(parsed: ParsedTransaction): boolean {
    return transactions.some(t =>
      t.date === parsed.date && t.type === parsed.type && Math.abs(t.amount - parsed.amount) < 0.005
    );
  }

  function buildPreview(parsed: ParsedTransaction[]) {
    const defaultCategoryId = categories[0]?.id || "";
    setPreviewRows(parsed.map(p => {
      const isDuplicate = isDuplicateOf(p);
      return { ...p, categoryId: defaultCategoryId, isDuplicate, include: !isDuplicate };
    }));
    setStep("preview");
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const content = await file.text();
    const looksLikeOfx = /\.ofx$/i.test(file.name) || content.includes("<STMTTRN>");

    if (looksLikeOfx) {
      const parsed = parseOfx(content);
      if (parsed.length === 0) {
        toast.error("Não encontrei nenhuma transação nesse arquivo OFX.");
        return;
      }
      buildPreview(parsed);
    } else {
      const parsed = parseCsv(content);
      if (parsed.headers.length === 0) {
        toast.error("Não consegui ler esse arquivo como CSV.");
        return;
      }
      setCsvData(parsed);
      setMapping(guessColumnMapping(parsed.headers));
      setStep("mapping");
    }
  }

  function confirmMapping() {
    if (!csvData) return;
    if (mapping.dateCol < 0 || mapping.amountCol < 0) {
      toast.error("Escolha pelo menos a coluna de data e a de valor.");
      return;
    }
    const parsed = buildTransactionsFromCsv(csvData.rows, mapping);
    if (parsed.length === 0) {
      toast.error("Nenhuma linha válida encontrada com esse mapeamento de colunas.");
      return;
    }
    buildPreview(parsed);
  }

  function toggleInclude(index: number) {
    setPreviewRows(prev => prev.map((r, i) => i === index ? { ...r, include: !r.include } : r));
  }
  function updateCategory(index: number, categoryId: string) {
    setPreviewRows(prev => prev.map((r, i) => i === index ? { ...r, categoryId } : r));
  }
  function toggleType(index: number) {
    setPreviewRows(prev => prev.map((r, i) => i === index ? { ...r, type: r.type === "income" ? "expense" : "income" } : r));
  }

  const includedRows = previewRows.filter(r => r.include);
  const duplicateCount = previewRows.filter(r => r.isDuplicate).length;

  async function handleImport() {
    if (includedRows.length === 0) {
      toast.error("Selecione pelo menos uma transação pra importar.");
      return;
    }

    setImporting(true);
    try {
      await addTransactionsBulk(includedRows.map(r => ({
        type: r.type,
        amount: r.amount,
        description: r.description,
        category: r.categoryId,
        date: r.date,
      })));
      toast.success(`${includedRows.length} transaç${includedRows.length === 1 ? "ão importada" : "ões importadas"} com sucesso!`);
      handleClose();
    } catch (err) {
      console.error("Erro ao importar transações:", err);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Importar Extrato" maxWidth={620}>
      {step === "upload" && (
        <div className="space-y-4">
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
            Importe um extrato exportado do seu banco ou cartão (CSV ou OFX) em vez de digitar cada transação uma por uma.
          </p>
          <label
            className="flex flex-col items-center justify-center gap-2 rounded-xl p-8 cursor-pointer"
            style={{ border: "1px dashed var(--border)", background: "var(--secondary)" }}
          >
            <Upload size={22} style={{ color: "var(--muted-foreground)" }} />
            <span style={{ color: "var(--foreground)", fontSize: "0.875rem", fontWeight: 500 }}>Escolher arquivo (.csv ou .ofx)</span>
            <input ref={fileInputRef} type="file" accept=".csv,.ofx,text/csv" className="hidden" onChange={handleFileChange} />
          </label>
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
          </div>
        </div>
      )}

      {step === "mapping" && csvData && (
        <div className="space-y-4">
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
            "{fileName}" — confirme qual coluna é qual antes de importar. Já tentamos adivinhar pelo nome do cabeçalho.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {MAPPING_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Select value={mapping[key] >= 0 ? String(mapping[key]) : undefined} onValueChange={(v) => setMapping(m => ({ ...m, [key]: Number(v) }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                  <SelectContent>
                    {csvData.headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Coluna ${i + 1}`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="rounded-xl overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
            <table style={{ width: "100%", fontSize: "0.75rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {csvData.headers.map((h, i) => (
                    <th key={i} style={{ padding: "6px 10px", textAlign: "left", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.rows.slice(0, 3).map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: "6px 10px", color: "var(--foreground)", whiteSpace: "nowrap" }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={reset}>Voltar</Button>
            <Button type="button" onClick={confirmMapping}>Continuar</Button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-3">
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>
            {previewRows.length} transações encontradas — {includedRows.length} selecionada{includedRows.length === 1 ? "" : "s"} pra importar.
          </p>
          {duplicateCount > 0 && (
            <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <AlertTriangle size={15} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 2 }} />
              <p style={{ color: "var(--warning)", fontSize: "0.78rem" }}>
                {duplicateCount} parece{duplicateCount === 1 ? "" : "m"} já existir (mesma data, tipo e valor de algo já lançado) — vieram desmarcadas, mas você pode incluir mesmo assim se não forem duplicatas de verdade.
              </p>
            </div>
          )}
          <div className="rounded-xl overflow-y-auto" style={{ border: "1px solid var(--border)", maxHeight: 360 }}>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {previewRows.map((row, i) => (
                <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5" style={{ opacity: row.include ? 1 : 0.55 }}>
                  <Checkbox checked={row.include} onCheckedChange={() => toggleInclude(i)} aria-label={`Incluir "${row.description}" na importação`} />
                  <div className="flex-1 min-w-0 basis-full sm:basis-auto">
                    <p className="truncate" style={{ fontSize: "0.8rem", color: "var(--foreground)" }}>{row.description}</p>
                    <p style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>
                      {toLocalDate(row.date).toLocaleDateString("pt-BR")}
                      {row.isDuplicate && " · possível duplicata"}
                    </p>
                  </div>
                  <button type="button" onClick={() => toggleType(i)} aria-label={`Mudar tipo de "${row.description}"`}
                    className="px-2 py-1 rounded-lg text-xs shrink-0"
                    style={{
                      background: row.type === "income" ? "rgba(16,217,164,0.15)" : "rgba(239,68,68,0.15)",
                      color: row.type === "income" ? "var(--success)" : "var(--red)",
                    }}>
                    {row.type === "income" ? "Receita" : "Despesa"}
                  </button>
                  <Select value={row.categoryId} onValueChange={(v) => updateCategory(i, v)}>
                    <SelectTrigger className="w-36 shrink-0" size="sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <span className="shrink-0" style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 600, width: 84, textAlign: "right", color: row.type === "income" ? "var(--success)" : "var(--red)" }}>
                    {formatCurrency(row.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between pt-1">
            <Button type="button" variant="secondary" onClick={reset} disabled={importing}>Cancelar</Button>
            <Button type="button" onClick={handleImport} disabled={importing || includedRows.length === 0}>
              {importing ? "Importando..." : `Importar ${includedRows.length}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
