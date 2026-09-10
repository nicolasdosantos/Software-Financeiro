import type { TransactionType } from "../app/context/FinanceContext";

export interface ParsedTransaction {
  date: string; // "YYYY-MM-DD"
  description: string;
  amount: number; // sempre positivo — o sinal já virou `type`
  type: TransactionType;
}

/**
 * Converte um valor monetário de texto pra número, lidando com as duas
 * convenções mais comuns em extratos: "1.234,56" (brasileira, vírgula
 * decimal) e "1234.56"/"1,234.56" (americana, ponto decimal). A regra: se a
 * ÚLTIMA vírgula vem depois do último ponto, a vírgula é o separador decimal
 * — senão, é o ponto (ou não há separador de milhar nenhum). Também aceita
 * negativo com "-" na frente ou entre parênteses, como "(50,00)".
 */
export function parseAmount(raw: string): number {
  let s = raw.trim().replace(/[R$\s]/gi, "");
  if (!s) return NaN;

  const isNegative = s.startsWith("-") || (s.startsWith("(") && s.endsWith(")"));
  s = s.replace(/[()+-]/g, "");

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }

  const value = parseFloat(s);
  if (Number.isNaN(value)) return NaN;
  return isNegative ? -value : value;
}

/** Tenta reconhecer "YYYY-MM-DD", "YYYY/MM/DD" ou "DD/MM/YYYY" (com "-" ou
 * "/"). Retorna null se não reconhecer o formato. */
export function parseFlexibleDate(raw: string): string | null {
  const s = raw.trim();

  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;

  return null;
}

function decodeOfxEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Extrai as transações de um arquivo OFX (extrato bancário no padrão aberto
 * que praticamente todo banco brasileiro oferece pra exportar). OFX real
 * quase nunca é XML bem-formado (tags sem fechamento é comum, principalmente
 * nas versões mais antigas/SGML) — por isso a extração é via regex em cima
 * de cada bloco <STMTTRN>...</STMTTRN>, não via parser de XML, que quebraria
 * na primeira tag sem fechar.
 */
export function parseOfx(content: string): ParsedTransaction[] {
  const blocks = content.split(/<STMTTRN>/i).slice(1);
  const results: ParsedTransaction[] = [];

  for (const block of blocks) {
    const dateMatch = block.match(/<DTPOSTED>\s*(\d{8})/i);
    const amountMatch = block.match(/<TRNAMT>\s*(-?[\d.,]+)/i);
    if (!dateMatch || !amountMatch) continue;

    const rawDate = dateMatch[1];
    const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;

    // TRNAMT no padrão OFX usa ponto como decimal, mas parseAmount lida com
    // isso do mesmo jeito (sem vírgula, cai no caminho "ponto é decimal").
    const rawAmount = parseAmount(amountMatch[1]);
    if (Number.isNaN(rawAmount)) continue;

    const memoMatch = block.match(/<MEMO>\s*([^\r\n<]+)/i);
    const nameMatch = block.match(/<NAME>\s*([^\r\n<]+)/i);
    const description = decodeOfxEntities((memoMatch?.[1] ?? nameMatch?.[1] ?? "Transação importada").trim());

    results.push({
      date,
      description,
      amount: Math.abs(rawAmount),
      type: rawAmount < 0 ? "expense" : "income",
    });
  }

  return results;
}

/** Quebra uma linha respeitando campos entre aspas (que podem conter o
 * próprio delimitador ou aspas escapadas como ""). */
function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/** Exportações de banco/planilha brasileiras costumam usar ";" (porque "," já
 * é o separador decimal) — conta os dois na primeira linha e usa o que
 * aparece mais, em vez de assumir vírgula sempre. */
function detectDelimiter(firstLine: string): string {
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(content: string): ParsedCsv {
  const lines = content.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const [headerLine, ...dataLines] = lines;

  return {
    headers: splitCsvLine(headerLine, delimiter),
    rows: dataLines.map(l => splitCsvLine(l, delimiter)),
  };
}

const DATE_KEYWORDS = ["data", "date", "dt"];
const DESCRIPTION_KEYWORDS = ["descri", "histor", "memo", "detalhe", "lancamento", "lançamento", "title"];
const AMOUNT_KEYWORDS = ["valor", "amount", "value", "montante"];

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export interface CsvColumnMapping {
  dateCol: number;
  descCol: number;
  amountCol: number;
}

/** Tenta adivinhar quais colunas são data/descrição/valor pelo nome do
 * cabeçalho. -1 quando não reconhece — a tela de importação sempre deixa o
 * usuário conferir e corrigir manualmente antes de importar, então um
 * palpite errado aqui não importa nenhuma transação sozinho. */
export function guessColumnMapping(headers: string[]): CsvColumnMapping {
  const normalized = headers.map(h => stripAccents(h.toLowerCase()));
  const findCol = (keywords: string[]) => normalized.findIndex(h => keywords.some(k => h.includes(stripAccents(k))));

  return {
    dateCol: findCol(DATE_KEYWORDS),
    descCol: findCol(DESCRIPTION_KEYWORDS),
    amountCol: findCol(AMOUNT_KEYWORDS),
  };
}

/** Aplica um mapeamento de colunas às linhas de um CSV já separado em campos,
 * convertendo cada linha válida numa transação. Linhas com data ou valor que
 * não dá pra interpretar são simplesmente ignoradas (não travam a importação
 * inteira por causa de uma linha de rodapé/total, comum em extratos). */
export function buildTransactionsFromCsv(rows: string[][], mapping: CsvColumnMapping): ParsedTransaction[] {
  const results: ParsedTransaction[] = [];

  for (const row of rows) {
    const rawDate = row[mapping.dateCol];
    const rawAmount = row[mapping.amountCol];
    const rawDesc = row[mapping.descCol];
    if (rawDate === undefined || rawAmount === undefined) continue;

    const date = parseFlexibleDate(rawDate);
    const amount = parseAmount(rawAmount);
    if (!date || Number.isNaN(amount) || amount === 0) continue;

    results.push({
      date,
      description: (rawDesc ?? "").trim() || "Transação importada",
      amount: Math.abs(amount),
      type: amount < 0 ? "expense" : "income",
    });
  }

  return results;
}
