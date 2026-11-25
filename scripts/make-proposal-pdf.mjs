// 기획서 HTML → PDF (로컬 Chrome 사용). 사용: node scripts/make-proposal-pdf.mjs
import { chromium } from "playwright-core";
import path from "node:path";
import { pathToFileURL } from "node:url";

const src = path.resolve("docs/proposal/proposal.html");
const out = path.resolve("submission/ReLifeAI_기획서.pdf");
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
const page = await browser.newPage();
await page.goto(pathToFileURL(src).href);
await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log(out);
