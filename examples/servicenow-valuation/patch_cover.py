from __future__ import annotations

import os
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
ET.register_namespace("", NS)


def qname(name: str) -> str:
    return f"{{{NS}}}{name}"


def set_inline_cell(row: ET.Element, ref: str, text: str, style: int) -> None:
    cell = next((item for item in row.findall(qname("c")) if item.get("r") == ref), None)
    if cell is None:
        cell = ET.SubElement(row, qname("c"), {"r": ref})
    cell.set("s", str(style))
    cell.set("t", "inlineStr")
    for child in list(cell):
        cell.remove(child)
    inline = ET.SubElement(cell, qname("is"))
    text_node = ET.SubElement(inline, qname("t"))
    text_node.text = text


def set_formula_cell(row: ET.Element, ref: str, formula: str, style: int) -> None:
    cell = next((item for item in row.findall(qname("c")) if item.get("r") == ref), None)
    if cell is None:
        cell = ET.SubElement(row, qname("c"), {"r": ref})
    cell.set("s", str(style))
    cell.attrib.pop("t", None)
    for child in list(cell):
        cell.remove(child)
    formula_node = ET.SubElement(cell, qname("f"))
    formula_node.text = formula


def clear_cell(row: ET.Element, ref: str, style: int) -> None:
    cell = next((item for item in row.findall(qname("c")) if item.get("r") == ref), None)
    if cell is None:
        cell = ET.SubElement(row, qname("c"), {"r": ref})
    cell.set("s", str(style))
    cell.attrib.pop("t", None)
    for child in list(cell):
        cell.remove(child)


def row_for(sheet_data: ET.Element, number: int) -> ET.Element:
    for row in sheet_data.findall(qname("row")):
        if int(row.get("r", "0")) == number:
            return row
    row = ET.Element(qname("row"), {"r": str(number)})
    for index, existing in enumerate(sheet_data.findall(qname("row"))):
        if int(existing.get("r", "0")) > number:
            sheet_data.insert(index, row)
            return row
    sheet_data.append(row)
    return row


def patch_cover_xml(sheet_xml: ET.Element) -> bytes:
    sheet_data = sheet_xml.find(qname("sheetData"))
    if sheet_data is None:
        raise RuntimeError("Cover sheet has no sheetData node")

    story = {
        4: ("Valuation story", 2, 18),
        5: ("Base value: $112.47, 15.5% above the $97.35 market snapshot.", 5, 24),
        6: (
            "What spot implies: about 14.5% annual revenue growth if SBC-adjusted EBIT margin reaches 26%.",
            4,
            30,
        ),
        7: (
            "Base variant: 17.6% revenue CAGR and SBC-adjusted EBIT margin rising from 16.5% to 26%.",
            4,
            30,
        ),
        8: (
            "Proof: cRPO holds near 20%, the 2030 subscription target stays credible, and SBC falls below 10% of revenue.",
            4,
            34,
        ),
        9: (
            "Break: growth falls below the market-implied path before margin expansion; downside value is $65.09.",
            4,
            30,
        ),
        10: (
            "Posture: watchlist / starter only. Terminal value is 79% of enterprise value, so duration risk remains high.",
            5,
            34,
        ),
    }

    for number, (text, style, height) in story.items():
        row = row_for(sheet_data, number)
        row.set("ht", str(height))
        row.set("customHeight", "1")
        set_inline_cell(row, f"D{number}", text, style)

    merge_cells = sheet_xml.find(qname("mergeCells"))
    if merge_cells is None:
        merge_cells = ET.Element(qname("mergeCells"))
        sheet_data_index = list(sheet_xml).index(sheet_data)
        sheet_xml.insert(sheet_data_index + 1, merge_cells)
    existing_merges = {item.get("ref") for item in merge_cells.findall(qname("mergeCell"))}
    for number in story:
        ref = f"D{number}:H{number}"
        if ref not in existing_merges:
            ET.SubElement(merge_cells, qname("mergeCell"), {"ref": ref})
    merge_cells.set("count", str(len(merge_cells.findall(qname("mergeCell")))))
    return ET.tostring(sheet_xml, encoding="utf-8", xml_declaration=True)


def patch_executive_xml(sheet_xml: ET.Element) -> bytes:
    sheet_data = sheet_xml.find(qname("sheetData"))
    if sheet_data is None:
        raise RuntimeError("Executive Summary sheet has no sheetData node")
    set_formula_cell(row_for(sheet_data, 13), "B13", "Sensitivities!G$50", 30)
    set_formula_cell(row_for(sheet_data, 14), "B14", "Sensitivities!G$52", 30)
    return ET.tostring(sheet_xml, encoding="utf-8", xml_declaration=True)


def patch_historical_xml(sheet_xml: ET.Element) -> bytes:
    sheet_data = sheet_xml.find(qname("sheetData"))
    if sheet_data is None:
        raise RuntimeError("Historical Financials sheet has no sheetData node")

    row_8 = row_for(sheet_data, 8)
    row_9 = row_for(sheet_data, 9)
    set_inline_cell(row_8, "A8", "Gross profit (not modeled)", 8)
    set_inline_cell(row_9, "A9", "Gross margin (not modeled)", 8)
    for column in "EFGHIJ":
        clear_cell(row_8, f"{column}8", 27)
        clear_cell(row_9, f"{column}9", 29)
    set_inline_cell(row_8, "K8", "not modeled", 5)
    set_inline_cell(row_9, "K9", "not modeled", 5)
    note = "Not used in valuation; no cost-of-revenue forecast was modeled."
    set_inline_cell(row_8, "L8", note, 5)
    set_inline_cell(row_9, "L9", note, 5)

    row_19 = row_for(sheet_data, 19)
    for column in "EFGHIJ":
        cell = next(item for item in row_19.findall(qname("c")) if item.get("r") == f"{column}19")
        cell.set("s", "27")

    row_20 = row_for(sheet_data, 20)
    for column in "EFGHIJ":
        set_formula_cell(
            row_20,
            f"{column}20",
            f"'Unlevered FCF'!{column}$14",
            27,
        )
    return ET.tostring(sheet_xml, encoding="utf-8", xml_declaration=True)


def patch_margin_xml(sheet_xml: ET.Element) -> bytes:
    sheet_data = sheet_xml.find(qname("sheetData"))
    if sheet_data is None:
        raise RuntimeError("Margin Cost Build sheet has no sheetData node")
    row_9 = row_for(sheet_data, 9)
    row_10 = row_for(sheet_data, 10)
    set_inline_cell(row_9, "A9", "Gross profit (not modeled)", 8)
    set_inline_cell(row_10, "A10", "Gross margin (not modeled)", 8)
    for column in "EFGHIJ":
        clear_cell(row_9, f"{column}9", 27)
        clear_cell(row_10, f"{column}10", 29)
    return ET.tostring(sheet_xml, encoding="utf-8", xml_declaration=True)


def patch_sensitivities_xml(sheet_xml: ET.Element) -> bytes:
    sheet_data = sheet_xml.find(qname("sheetData"))
    if sheet_data is None:
        raise RuntimeError("Sensitivities sheet has no sheetData node")

    # Build two fully independent operating-case DCFs behind the visible case
    # matrix. The original template used a directional multiplier for the
    # downside/upside cells; these formulas instead discount each scenario's
    # revenue, owner-EBIT, taxes, D&A, capex, and NWC cash flows.
    cases = {
        "Downside": {
            "columns": ["B", "C", "D", "E", "F", "G"],
            "growth_row": 22,
            "ebit_row": 32,
            "da_row": 37,
            "capex_row": 42,
            "nwc_row": 47,
            "tax_row": 57,
            "output_cell": "G50",
        },
        "Upside": {
            "columns": ["I", "J", "K", "L", "M", "N"],
            "growth_row": 23,
            "ebit_row": 33,
            "da_row": 38,
            "capex_row": 43,
            "nwc_row": 48,
            "tax_row": 58,
            "output_cell": "G52",
        },
    }

    for case in cases.values():
        columns = case["columns"]
        for index, column in enumerate(columns):
            assumption_column = chr(ord("B") + index)
            previous_revenue = (
                "'Historical Financials'!$D$6"
                if index == 0
                else f"{columns[index - 1]}56"
            )
            previous_nwc = (
                "'Historical Financials'!$D$18"
                if index == 0
                else f"{columns[index - 1]}61"
            )
            set_formula_cell(
                row_for(sheet_data, 56),
                f"{column}56",
                f"{previous_revenue}*(1+'Control Panel'!{assumption_column}${case['growth_row']})",
                27,
            )
            set_formula_cell(
                row_for(sheet_data, 57),
                f"{column}57",
                f"{column}56*'Control Panel'!{assumption_column}${case['ebit_row']}",
                27,
            )
            set_formula_cell(
                row_for(sheet_data, 58),
                f"{column}58",
                f"{column}57*'Control Panel'!{assumption_column}${case['tax_row']}",
                27,
            )
            set_formula_cell(
                row_for(sheet_data, 59),
                f"{column}59",
                f"{column}56*'Control Panel'!{assumption_column}${case['da_row']}",
                27,
            )
            set_formula_cell(
                row_for(sheet_data, 60),
                f"{column}60",
                f"{column}56*'Control Panel'!{assumption_column}${case['capex_row']}",
                27,
            )
            set_formula_cell(
                row_for(sheet_data, 61),
                f"{column}61",
                f"{column}56*'Control Panel'!{assumption_column}${case['nwc_row']}",
                27,
            )
            set_formula_cell(
                row_for(sheet_data, 62),
                f"{column}62",
                f"{column}61-{previous_nwc}",
                27,
            )
            set_formula_cell(
                row_for(sheet_data, 63),
                f"{column}63",
                f"{column}57-{column}58+{column}59-{column}60-{column}62",
                27,
            )
            set_formula_cell(
                row_for(sheet_data, 64),
                f"{column}64",
                f"1/(1+'Control Panel'!$B$78)^{index + 1}",
                29,
            )
            set_formula_cell(
                row_for(sheet_data, 65),
                f"{column}65",
                f"{column}63*{column}64",
                27,
            )

        terminal_column = columns[-1]
        set_formula_cell(
            row_for(sheet_data, 66),
            f"{terminal_column}66",
            f"{terminal_column}63*(1+'Control Panel'!$B$83)/"
            f"('Control Panel'!$B$78-'Control Panel'!$B$83)",
            27,
        )
        set_formula_cell(
            row_for(sheet_data, 67),
            f"{terminal_column}67",
            f"{terminal_column}66*{terminal_column}64",
            27,
        )
        set_formula_cell(
            row_for(sheet_data, 68),
            f"{terminal_column}68",
            f"SUM({columns[0]}65:{terminal_column}65)+{terminal_column}67",
            27,
        )
        set_formula_cell(
            row_for(sheet_data, 69),
            f"{terminal_column}69",
            f"{terminal_column}68-'Control Panel'!$B$85",
            27,
        )
        set_formula_cell(
            row_for(sheet_data, 70),
            f"{terminal_column}70",
            f"{terminal_column}69/'Control Panel'!$B$86",
            27,
        )
        output_row = int("".join(filter(str.isdigit, case["output_cell"])))
        set_formula_cell(
            row_for(sheet_data, output_row),
            case["output_cell"],
            f"{terminal_column}70",
            27,
        )
        set_formula_cell(
            row_for(sheet_data, output_row),
            f"H{output_row}",
            f"{case['output_cell']}/'Control Panel'!$B$12-1",
            29,
        )

    for number in range(55, 71):
        row = row_for(sheet_data, number)
        row.set("hidden", "1")
    return ET.tostring(sheet_xml, encoding="utf-8", xml_declaration=True)


def patch_workbook(path: Path) -> None:
    with zipfile.ZipFile(path, "r") as source:
        patched = {
            "xl/worksheets/sheet1.xml": patch_cover_xml(
                ET.fromstring(source.read("xl/worksheets/sheet1.xml"))
            ),
            "xl/worksheets/sheet2.xml": patch_executive_xml(
                ET.fromstring(source.read("xl/worksheets/sheet2.xml"))
            ),
            "xl/worksheets/sheet4.xml": patch_historical_xml(
                ET.fromstring(source.read("xl/worksheets/sheet4.xml"))
            ),
            "xl/worksheets/sheet6.xml": patch_margin_xml(
                ET.fromstring(source.read("xl/worksheets/sheet6.xml"))
            ),
            "xl/worksheets/sheet14.xml": patch_sensitivities_xml(
                ET.fromstring(source.read("xl/worksheets/sheet14.xml"))
            ),
        }
        with tempfile.NamedTemporaryFile(
            prefix="servicenow-valuation-",
            suffix=".xlsx",
            dir=path.parent,
            delete=False,
        ) as handle:
            temp_path = Path(handle.name)

        try:
            with zipfile.ZipFile(path, "r") as source, zipfile.ZipFile(
                temp_path, "w", compression=zipfile.ZIP_DEFLATED
            ) as target:
                for item in source.infolist():
                    data = patched.get(item.filename, source.read(item.filename))
                    target.writestr(item, data)
            os.replace(temp_path, path)
        finally:
            temp_path.unlink(missing_ok=True)


if __name__ == "__main__":
    patch_workbook(
        Path(
            "examples/servicenow-valuation/outputs/"
            "019f8a51-b282-7320-9a22-cc1ef608143b/"
            "servicenow-valuation-model.xlsx"
        )
    )
