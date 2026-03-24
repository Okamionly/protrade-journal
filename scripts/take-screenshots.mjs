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

  // Pre-set localStorage BEFORE login
  await page.goto(BASE + "/login", { waitUntil: "networkidle2" });
  await page.evaluate(() => {
    localStorage.setItem("onboarding-complete", "true");
    localStorage.setItem("theme", "dark");
    localStorage.setItem("morning-briefing-dismissed-" + new Date().toISOString().slice(0,10), "true");
    localStorage.setItem("smart-alerts-dismissed", JSON.stringify({}));
  });

  // Login
  await page.type('input[type="email"]', "mr.guessousyoussef@gmail.com");
  await page.type('input[type="password"]', "Guessous34.");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  // Force dark mode after login
  await page.evaluate(() => {
    localStorage.setItem("onboarding-complete", "true");
    localStorage.setItem("theme", "dark");
    document.documentElement.classList.remove("light", "oled");
    document.documentElement.classList.add("dark");
  });

  for (const p of pages) {
    console.log("Capturing", p.name);
    await page.goto(BASE + p.path, { waitUntil: "networkidle2", timeout: 20000 }).catch(() => {});
    
    // Dismiss everything
    await page.evaluate(() => {
      localStorage.setItem("onboarding-complete", "true");
      document.documentElement.classList.remove("light", "oled");
      document.documentElement.classList.add("dark");
    });
    await new Promise(r => setTimeout(r, 5000));

    // Close any modals/alerts
    await page.evaluate(() => {
      document.querySelectorAll('button').forEach(b => {
        if (b.textContent.includes('Passer') || b.textContent.includes('×') || b.getAttribute('aria-label') === 'close') b.click();
      });
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({ path: path.join(OUT, p.name + ".png"), fullPage: false });
    console.log("Saved", p.name + ".png");
  }

  await browser.close();
  console.log("Done!");
})();
