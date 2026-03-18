import puppeteer from "puppeteer";
import path from "path";

const BASE = "http://localhost:3000";
const OUT = path.join(__dirname, "..", "public", "screenshots");

const PAGES = [
  { name: "dashboard", path: "/dashboard", delay: 2000 },
  { name: "analytics", path: "/analytics", delay: 2000 },
  { name: "ai-coach", path: "/ai-coach", delay: 2000 },
  { name: "war-room", path: "/war-room", delay: 2000 },
  { name: "challenges", path: "/challenges", delay: 2000 },
  { name: "correlation", path: "/correlation", delay: 2000 },
  { name: "backtest", path: "/backtest", delay: 2000 },
  { name: "calendar", path: "/calendar", delay: 2000 },
];

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  // Login first
  console.log("Logging in...");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.type('input[type="email"], input[placeholder*="email"]', "demo@marketphase.app");
  await page.type('input[type="password"]', "Demo1234!");
  await page.click("button");
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 3000));
  console.log("Logged in at:", page.url());

  // Set dark theme
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("oled");
    localStorage.setItem("theme", "dark");
  });

  // Take screenshots
  for (const p of PAGES) {
    console.log(`Capturing ${p.name}...`);
    await page.goto(`${BASE}${p.path}`, { waitUntil: "networkidle2", timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, p.delay));

    // Force dark theme on each page
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("oled");
    });
    await new Promise((r) => setTimeout(r, 500));

    const filePath = path.join(OUT, `${p.name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`  -> ${filePath}`);
  }

  await browser.close();
  console.log("\nDone! Screenshots saved to public/screenshots/");
}

main().catch(console.error);
