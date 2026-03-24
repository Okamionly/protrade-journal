import puppeteer from "puppeteer";
import GIFEncoder from "gif-encoder-2";
import { PNG } from "pngjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "screenshots");
const BASE = "https://marketphase.vercel.app";
const TEMP = path.join(__dirname, "..", ".temp-frames");

const PAGES = [
  { path: "/dashboard", wait: 6000 },
  { path: "/journal", wait: 5000 },
  { path: "/analytics", wait: 5000 },
  { path: "/cot", wait: 5000 },
  { path: "/calendar", wait: 5000 },
  { path: "/war-room", wait: 5000 },
];

const W = 960;
const H = 540;

(async () => {
  if (!fs.existsSync(TEMP)) fs.mkdirSync(TEMP, { recursive: true });

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });

  // Login
  console.log("Logging in...");
  await page.goto(BASE + "/login", { waitUntil: "networkidle2" });
  await page.evaluate(() => {
    localStorage.setItem("onboarding-complete", "true");
    localStorage.setItem("theme", "dark");
  });
  await page.type('input[type="email"]', "mr.guessousyoussef@gmail.com");
  await page.type('input[type="password"]', "Guessous34.");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
  await page.evaluate(() => {
    localStorage.setItem("onboarding-complete", "true");
    document.documentElement.classList.add("dark");
  });
  await page.reload({ waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 2000));

  // Capture PNG frames
  const framePaths = [];
  for (let i = 0; i < PAGES.length; i++) {
    const p = PAGES[i];
    console.log("Frame " + (i+1) + "/" + PAGES.length + ": " + p.path);
    await page.goto(BASE + p.path, { waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});
    await page.evaluate(() => { document.documentElement.classList.add("dark"); });
    await new Promise(r => setTimeout(r, p.wait));
    await page.keyboard.press("Escape");
    await new Promise(r => setTimeout(r, 500));
    const fp = path.join(TEMP, "frame-" + i + ".png");
    await page.screenshot({ path: fp, type: "png" });
    framePaths.push(fp);
  }
  await browser.close();

  // Build GIF
  console.log("Building GIF...");
  const encoder = new GIFEncoder(W, H, "neuquant", true);
  encoder.setDelay(2500);
  encoder.setRepeat(0);
  encoder.setQuality(15);
  encoder.start();

  for (const fp of framePaths) {
    const data = fs.readFileSync(fp);
    const png = PNG.sync.read(data);
    encoder.addFrame(png.data);
    console.log("  Added frame");
  }

  encoder.finish();
  const gifPath = path.join(OUT, "hero-demo.gif");
  fs.writeFileSync(gifPath, encoder.out.getData());
  const sizeMB = (fs.statSync(gifPath).size / 1024 / 1024).toFixed(1);
  console.log("Done! " + gifPath + " (" + sizeMB + " MB)");

  // Cleanup
  framePaths.forEach(f => fs.unlinkSync(f));
  fs.rmdirSync(TEMP);
})();
