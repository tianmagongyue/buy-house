const fs = require("node:fs");
const path = require("node:path");

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return null;
  const value = process.argv[idx + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function normalizeCell(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  if (t === "--") return "";
  return t;
}

function main() {
  const inFile = getArg("in");
  const outFile = getArg("out");
  const year = Number(getArg("year") || "2021");
  const sourceUrl = getArg("sourceUrl") || "https://www.fangdi.com.cn/new_house/new_house_jjswlpgs.html";
  const sourceTitle = getArg("sourceTitle") || "网上房地产-新楼盘认购公示";

  if (!inFile) throw new Error("Missing --in <text file>");
  if (!outFile) throw new Error("Missing --out <json file>");

  const absIn = path.isAbsolute(inFile) ? inFile : path.join(process.cwd(), inFile);
  const absOut = path.isAbsolute(outFile) ? outFile : path.join(process.cwd(), outFile);

  const raw = fs.readFileSync(absIn, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const headers = [
    "项目名称",
    "所在区",
    "预售许可证号/不动产权证号",
    "开发企业",
    "项目地址",
    "户型",
    "产品类型",
    "上市面积",
    "套数",
    "备案均价",
    "入围比",
    "认购地址",
    "认购开始时间",
    "认购结束时间",
    "认购联系电话/网址",
    "区局监督电话"
  ];

  const headerHint = (s) =>
    s.includes("项目名称") && s.includes("所在区") && s.includes("认购开始时间") && s.includes("区局监督电话");

  const cleaned = lines.filter((l) => !headerHint(l));

  let start = 0;
  for (; start < cleaned.length; start++) {
    if (cleaned[start] === headers[0]) break;
  }
  if (start < cleaned.length) start += headers.length;
  else start = 0;

  const data = cleaned.slice(start);
  const rowSize = headers.length;
  if (data.length % rowSize !== 0) {
    throw new Error(`Bad table copy: cells=${data.length}, expected multiple of ${rowSize}`);
  }
  const rows = [];
  for (let i = 0; i + rowSize <= data.length; i += rowSize) {
    const cells = data.slice(i, i + rowSize).map(normalizeCell);
    const obj = Object.fromEntries(headers.map((h, idx) => [h, cells[idx]]));
    const name = obj["项目名称"];
    const district = obj["所在区"];
    if (!name || !district) continue;
    const address = obj["项目地址"] || obj["认购地址"];
    const endAt = obj["认购结束时间"];
    rows.push({
      name,
      district,
      address,
      triggeredAt: endAt || "",
      triggeredAtPrecision: "day",
      sourceTitle,
      sourceUrl,
      permitNo: obj["预售许可证号/不动产权证号"] || null,
      developer: obj["开发企业"] || null,
      unitTypes: obj["户型"] || null,
      productType: obj["产品类型"] || null,
      listedArea: obj["上市面积"] || null,
      units: obj["套数"] || null,
      filingAvgPrice: obj["备案均价"] || null,
      cutoffRatio: obj["入围比"] || null,
      subscribeAddress: obj["认购地址"] || null,
      subscribeStartAt: obj["认购开始时间"] || null,
      subscribeEndAt: obj["认购结束时间"] || null,
      subscribeContact: obj["认购联系电话/网址"] || null,
      districtSupervisionPhone: obj["区局监督电话"] || null,
      year
    });
  }

  fs.writeFileSync(absOut, JSON.stringify(rows, null, 2) + "\n");
}

main();
