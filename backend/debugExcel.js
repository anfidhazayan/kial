const xlsx = require("xlsx");

const filePath = process.argv[2];
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// We need to parse merged headers exactly like excelService does
const range = xlsx.utils.decode_range(sheet["!ref"]);
for (let c = range.s.c; c <= range.e.c; c++) {
  const topCellAddress = xlsx.utils.encode_cell({ r: 0, c: c });
  const bottomCellAddress = xlsx.utils.encode_cell({ r: 1, c: c });
  
  const topCell = sheet[topCellAddress];
  const bottomCell = sheet[bottomCellAddress];
  
  if (!bottomCell || !bottomCell.v) {
    if (topCell && topCell.v) {
      sheet[bottomCellAddress] = { t: 's', v: topCell.v };
    }
  }
}

const data = xlsx.utils.sheet_to_json(sheet, { range: 1, defval: "" });

const rejith = data.find(row => (row["Name"] || row["Full Name"] || "").includes("REJITH"));
console.log(JSON.stringify(rejith, null, 2));
