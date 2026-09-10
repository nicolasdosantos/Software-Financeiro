import { describe, expect, it } from "vitest";
import {
  buildTransactionsFromCsv,
  guessColumnMapping,
  parseAmount,
  parseCsv,
  parseFlexibleDate,
  parseOfx,
} from "./importParsers";

describe("parseAmount", () => {
  it("interpreta formato brasileiro (vírgula decimal, ponto de milhar)", () => {
    expect(parseAmount("1.234,56")).toBeCloseTo(1234.56);
  });

  it("interpreta formato americano (ponto decimal, vírgula de milhar)", () => {
    expect(parseAmount("1,234.56")).toBeCloseTo(1234.56);
  });

  it("interpreta ponto decimal simples, sem separador de milhar", () => {
    expect(parseAmount("57.50")).toBeCloseTo(57.5);
  });

  it("interpreta vírgula decimal simples, sem separador de milhar", () => {
    expect(parseAmount("57,50")).toBeCloseTo(57.5);
  });

  it("reconhece negativo com sinal de menos na frente", () => {
    expect(parseAmount("-57,50")).toBeCloseTo(-57.5);
  });

  it("reconhece negativo entre parênteses", () => {
    expect(parseAmount("(57,50)")).toBeCloseTo(-57.5);
  });

  it("ignora o prefixo R$ e espaços", () => {
    expect(parseAmount("R$ 1.000,00")).toBeCloseTo(1000);
  });

  it("retorna NaN para texto que não é um valor", () => {
    expect(Number.isNaN(parseAmount("abc"))).toBe(true);
  });

  it("retorna NaN para string vazia", () => {
    expect(Number.isNaN(parseAmount(""))).toBe(true);
  });
});

describe("parseFlexibleDate", () => {
  it("reconhece YYYY-MM-DD", () => {
    expect(parseFlexibleDate("2026-09-10")).toBe("2026-09-10");
  });

  it("reconhece DD/MM/YYYY (formato brasileiro comum em extratos)", () => {
    expect(parseFlexibleDate("10/09/2026")).toBe("2026-09-10");
  });

  it("reconhece YYYY/MM/DD", () => {
    expect(parseFlexibleDate("2026/09/10")).toBe("2026-09-10");
  });

  it("preenche dia/mês com zero à esquerda quando vêm sem", () => {
    expect(parseFlexibleDate("5/9/2026")).toBe("2026-09-05");
  });

  it("retorna null pra texto que não parece uma data", () => {
    expect(parseFlexibleDate("não é data")).toBeNull();
  });
});

describe("parseOfx", () => {
  const sample = `OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260905120000[-03:EST]
<TRNAMT>-57.50
<FITID>202609050001
<MEMO>PADARIA CENTRAL
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260904120000
<TRNAMT>1000.00
<FITID>202609040001
<MEMO>SALARIO
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

  it("extrai as transações de um extrato OFX típico (tags sem fechamento, como é comum de verdade)", () => {
    const result = parseOfx(sample);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: "2026-09-05", description: "PADARIA CENTRAL", amount: 57.5, type: "expense" });
    expect(result[1]).toEqual({ date: "2026-09-04", description: "SALARIO", amount: 1000, type: "income" });
  });

  it("usa <NAME> quando não existe <MEMO>", () => {
    const content = `<STMTTRN>
<DTPOSTED>20260901000000
<TRNAMT>-10.00
<NAME>LOJA XPTO
</STMTTRN>`;

    expect(parseOfx(content)[0].description).toBe("LOJA XPTO");
  });

  it("ignora blocos sem data ou sem valor, em vez de quebrar a importação inteira", () => {
    const content = `<STMTTRN>
<TRNAMT>-10.00
<MEMO>SEM DATA, DEVE SER IGNORADO
</STMTTRN>
<STMTTRN>
<DTPOSTED>20260901000000
<TRNAMT>-25.00
<MEMO>VALIDO
</STMTTRN>`;

    const result = parseOfx(content);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("VALIDO");
  });

  it("retorna array vazio quando não há nenhum <STMTTRN>", () => {
    expect(parseOfx("qualquer coisa sem transação nenhuma")).toEqual([]);
  });
});

describe("parseCsv", () => {
  it("separa por vírgula quando é o delimitador mais comum na primeira linha", () => {
    const result = parseCsv("Data,Descrição,Valor\n10/09/2026,Mercado,-50,00");
    expect(result.headers).toEqual(["Data", "Descrição", "Valor"]);
  });

  it("detecta ponto-e-vírgula como delimitador (comum em exportações brasileiras)", () => {
    const result = parseCsv("Data;Descrição;Valor\n10/09/2026;Mercado;-50,00");
    expect(result.headers).toEqual(["Data", "Descrição", "Valor"]);
    expect(result.rows).toEqual([["10/09/2026", "Mercado", "-50,00"]]);
  });

  it("respeita campos entre aspas que contêm o próprio delimitador", () => {
    // Delimitador ";" de propósito aqui: é exatamente o caso real que leva um
    // extrato a usar ";" em vez de "," — o valor decimal já usa vírgula.
    const result = parseCsv('Data;Descrição;Valor\n10/09/2026;"Mercado, Loja 2";-50,00');
    expect(result.rows[0]).toEqual(["10/09/2026", "Mercado, Loja 2", "-50,00"]);
  });

  it("ignora linhas em branco", () => {
    const result = parseCsv("Data,Descrição,Valor\n\n10/09/2026,Mercado,-50\n\n");
    expect(result.rows).toHaveLength(1);
  });
});

describe("guessColumnMapping", () => {
  it("reconhece cabeçalhos em português", () => {
    expect(guessColumnMapping(["Data", "Descrição", "Valor"])).toEqual({ dateCol: 0, descCol: 1, amountCol: 2 });
  });

  it("reconhece cabeçalhos em inglês, em qualquer ordem", () => {
    expect(guessColumnMapping(["Amount", "Description", "Date"])).toEqual({ dateCol: 2, descCol: 1, amountCol: 0 });
  });

  it("ignora acentos e maiúsculas/minúsculas", () => {
    expect(guessColumnMapping(["DATA", "HISTÓRICO", "VALOR (R$)"])).toEqual({ dateCol: 0, descCol: 1, amountCol: 2 });
  });

  it("retorna -1 pra coluna que não reconhece, em vez de adivinhar errado", () => {
    expect(guessColumnMapping(["Coluna X", "Coluna Y"])).toEqual({ dateCol: -1, descCol: -1, amountCol: -1 });
  });
});

describe("buildTransactionsFromCsv", () => {
  const mapping = { dateCol: 0, descCol: 1, amountCol: 2 };

  it("converte linhas válidas em transações, inferindo o tipo pelo sinal do valor", () => {
    const rows = [
      ["10/09/2026", "Mercado", "-50,00"],
      ["04/09/2026", "Salario", "1000,00"],
    ];

    expect(buildTransactionsFromCsv(rows, mapping)).toEqual([
      { date: "2026-09-10", description: "Mercado", amount: 50, type: "expense" },
      { date: "2026-09-04", description: "Salario", amount: 1000, type: "income" },
    ]);
  });

  it("ignora linhas com data inválida ou valor zero (ex: linha de total no rodapé)", () => {
    const rows = [
      ["10/09/2026", "Mercado", "-50,00"],
      ["TOTAL", "", "0,00"],
      ["não é uma data", "Lixo", "-10,00"],
    ];

    expect(buildTransactionsFromCsv(rows, mapping)).toHaveLength(1);
  });

  it("usa uma descrição padrão quando a coluna de descrição vem vazia", () => {
    const rows = [["10/09/2026", "", "-50,00"]];
    expect(buildTransactionsFromCsv(rows, mapping)[0].description).toBe("Transação importada");
  });
});
