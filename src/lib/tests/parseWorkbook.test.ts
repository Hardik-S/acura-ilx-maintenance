// @vitest-environment node

import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseMaintenanceWorkbook } from "@/lib/import/parseWorkbook";

describe("parseMaintenanceWorkbook", () => {
  it("groups blank-date rows under the most recent dated event and parses torque specs", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.getCell("A1").value = "Date";
    sheet.getCell("B1").value = "Service Item";
    sheet.getCell("C1").value = "Odometer";
    sheet.getCell("D1").value = "Notes";
    sheet.getCell("F1").value = "Torque Specs";
    sheet.mergeCells("F1:G1");
    sheet.getCell("A2").value = 46055;
    sheet.getCell("B2").value = "Rear shock absorbers";
    sheet.getCell("C2").value = 93700;
    sheet.getCell("D2").value = "Done by seller";
    sheet.getCell("F2").value = "Spark Plugs";
    sheet.getCell("G2").value = "18 ft-lbs";
    sheet.getCell("B3").value = "Rear stabilizer end links";
    sheet.getCell("C3").value = 93700;
    sheet.getCell("D3").value = "Done by seller";
    sheet.getCell("B4").value = "Exhaust flange";
    sheet.getCell("C4").value = 93700;
    sheet.getCell("D4").value = "Done by seller, behind muffler";
    sheet.getCell("B5").value = "Brake service";
    sheet.getCell("C5").value = 93700;
    sheet.getCell("D5").value = "Done by seller";
    sheet.getCell("A6").value = 46115;
    sheet.getCell("B6").value = "Back up camera";
    sheet.getCell("C6").value = 98154;
    sheet.getCell("D6").value = "OE went blurry, Amazon replacement ";
    sheet.getCell("A7").value = 46122;
    sheet.getCell("B7").value = "Engine air filter ";
    sheet.getCell("C7").value = 98993;
    sheet.getCell("D7").value = "Fram";
    sheet.getCell("B8").value = "Cabin air filter";
    sheet.getCell("C8").value = 98993;
    sheet.getCell("D8").value = "Motomaster";
    sheet.getCell("A9").value = 46123;
    sheet.getCell("B9").value = "Spark plugs";
    sheet.getCell("C9").value = 98995;
    sheet.getCell("D9").value = "NGK ILZKR7B11S";

    const buffer = await workbook.xlsx.writeBuffer();
    const parsed = await parseMaintenanceWorkbook(toArrayBuffer(buffer), "maintenance.xlsx");

    expect(parsed.serviceEvents).toHaveLength(4);
    expect(parsed.serviceItems).toHaveLength(8);
    expect(parsed.torqueSpecs).toHaveLength(1);

    const sellerEvent = parsed.serviceEvents.find((event) => event.serviceDate === "2026-02-02");
    expect(sellerEvent).toBeDefined();
    expect(parsed.serviceItems.filter((item) => item.serviceEventId === sellerEvent?.id)).toHaveLength(4);

    const filterEvent = parsed.serviceEvents.find((event) => event.serviceDate === "2026-04-10");
    expect(filterEvent).toBeDefined();
    expect(parsed.serviceItems.filter((item) => item.serviceEventId === filterEvent?.id)).toHaveLength(2);

    expect(parsed.torqueSpecs[0]).toMatchObject({
      component: "Spark Plugs",
      spec: "18 ft-lbs",
    });
    expect(parsed.warnings).toHaveLength(0);
  });

  it("warns and leaves the event odometer unknown when a row has negative mileage", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.getCell("A1").value = "Date";
    sheet.getCell("B1").value = "Service Item";
    sheet.getCell("C1").value = "Odometer";
    sheet.getCell("D1").value = "Notes";
    sheet.getCell("A2").value = 46123;
    sheet.getCell("B2").value = "Oil service";
    sheet.getCell("C2").value = -100;
    sheet.getCell("D2").value = "Impossible odometer from source workbook";

    const buffer = await workbook.xlsx.writeBuffer();
    const parsed = await parseMaintenanceWorkbook(toArrayBuffer(buffer), "maintenance.xlsx");

    expect(parsed.serviceEvents[0]?.odometer).toBe(0);
    expect(parsed.sourceRows[0]?.parsedOdometer).toBeUndefined();
    expect(parsed.warnings).toEqual(["Row 2: odometer could not be parsed."]);
  });
});

function toArrayBuffer(buffer: ArrayBuffer | Buffer) {
  if (buffer instanceof ArrayBuffer) {
    return buffer;
  }

  const view = new Uint8Array(buffer);
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
}
