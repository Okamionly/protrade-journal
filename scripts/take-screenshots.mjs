import puppeteer from "puppeteer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "screenshots");
const BASE = "https://marketphase.vercel.app";

const pages = [
  { name: "dashboard", path: "/dashboard" },
  { name: "journal", path: "/journal" },
  { name: "analytics", path: "/analytics" },
  { name: "ai-coach", path: "/ai-coach" },
];

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--window-size=1920,1080"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Login page - set localStorage FIRST
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

  for (const p of pages) {
    console.log("Capturing", p.name);
    await page.goto(BASE + p.path, { waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});
    
    // Ensure dark + dismiss onboarding
    await page.evaluate(() => {
      localStorage.setItem("onboarding-complete", "true");
      document.documentElement.classList.remove("light", "oled");
      document.documentElement.classList.add("dark");
    });
    
    // Wait for page to fully render
    await new Promise(r => setTimeout(r, 6000));

    // Only press Escape to close any open modals (safe, no clicking)
    await page.keyboard.press("Escape");
    await new Promise(r => setTimeout(r, 500));

    await page.screenshot({ path: path.join(OUT, p.name + ".png"), fullPage: false });
    console.log("Saved", p.name + ".png");
  }

  await browser.close();
  console.log("Done!");
})();
