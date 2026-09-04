import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/firefox",
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();

  const consoleMessages = [];
  page.on("console", (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  const pageErrors = [];
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  const requestUrls = [];
  page.on("request", (req) => {
    requestUrls.push(`${req.method()} ${req.url()}`);
  });

  console.log("=== Loading /signup ===");
  await page.goto("http://localhost:3000/signup", {
    waitUntil: "networkidle0",
    timeout: 30000,
  });

  console.log("=== Page title ===");
  console.log(await page.title());

  console.log("=== Filling form ===");
  await page.type("#username", `puppeteeruser${Date.now()}`);
  await page.type("#email", `puppeteer${Date.now()}@test.com`);
  await page.type("#password", "password123");

  console.log("=== Clicking submit button ===");
  // Find the button by text
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const submitBtn = buttons.find((b) =>
      b.textContent?.includes("Create account"),
    );
    if (submitBtn) {
      submitBtn.click();
    } else {
      throw new Error("Submit button not found");
    }
  });

  console.log("=== Waiting for API response ===");
  await new Promise((r) => setTimeout(r, 5000));

  console.log("\n=== Console messages ===");
  consoleMessages.forEach((m) => console.log(m));

  console.log("\n=== Page errors ===");
  if (pageErrors.length === 0) {
    console.log("(none)");
  } else {
    pageErrors.forEach((e) => console.log(e));
  }

  console.log("\n=== API requests made ===");
  const apiRequests = requestUrls.filter((u) => u.includes("/api/"));
  if (apiRequests.length === 0) {
    console.log("(NO API REQUESTS - THIS IS THE BUG)");
  } else {
    apiRequests.forEach((r) => console.log(r));
  }

  console.log("\n=== Current URL ===");
  console.log(page.url());

  console.log("\n=== Page content (error/success area) ===");
  const errorText = await page.evaluate(() => {
    const errorEl = document.querySelector(".text-htb-red");
    const successEl = document.querySelector(".text-htb-green");
    return {
      error: errorEl?.textContent,
      success: successEl?.textContent,
    };
  });
  console.log(JSON.stringify(errorText, null, 2));
} finally {
  await browser.close();
}
