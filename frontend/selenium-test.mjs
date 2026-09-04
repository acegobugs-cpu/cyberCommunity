// Test the signup form using Firefox's WebDriver protocol
// This will actually load the page in a real browser and simulate user interaction

import { spawn } from "child_process";
import { setTimeout as sleep } from "timers/promises";

// Start geckodriver if available
let geckodriver;
try {
  geckodriver = spawn("geckodriver", ["--port=4444"], { stdio: "pipe" });
  await sleep(2000);
} catch (e) {
  console.log("geckodriver not available, trying alternative approach");
  process.exit(1);
}

import { Builder, By, until } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";

let driver;
try {
  driver = await new Builder()
    .forBrowser("firefox")
    .usingServer("http://localhost:4444")
    .build();

  const consoleLogs = [];
  driver.onLogEvent(async (event) => {
    consoleLogs.push(event);
  });

  console.log("=== Loading /signup ===");
  await driver.get("http://localhost:3000/signup");
  await sleep(2000);

  console.log("=== Filling form ===");
  const timestamp = Date.now();
  await driver.findElement(By.id("username")).sendKeys(`seleniumuser${timestamp}`);
  await driver.findElement(By.id("email")).sendKeys(`selenium${timestamp}@test.com`);
  await driver.findElement(By.id("password")).sendKeys("password123");

  console.log("=== Clicking submit button ===");
  // Track network requests
  await driver.executeScript(`
    window.__apiRequests = [];
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      window.__apiRequests.push(args[0]);
      return originalFetch.apply(this, args);
    };
  `);

  const button = await driver.findElement(By.xpath("//button[contains(text(), 'Create account')]"));
  await button.click();

  console.log("=== Waiting for response ===");
  await sleep(5000);

  const apiRequests = await driver.executeScript(`
    return window.__apiRequests || [];
  `);

  console.log("\n=== API requests made ===");
  if (apiRequests.length === 0) {
    console.log("(NO API REQUESTS - BUG REPRODUCED)");
  } else {
    apiRequests.forEach((r) => console.log(r));
  }

  const currentUrl = await driver.getCurrentUrl();
  console.log("\n=== Current URL ===");
  console.log(currentUrl);

  const errorText = await driver.findElement(By.css(".text-htb-red")).getText().catch(() => null);
  const successText = await driver.findElement(By.css(".text-htb-green")).getText().catch(() => null);

  console.log("\n=== UI feedback ===");
  console.log("Error:", errorText);
  console.log("Success:", successText);
} catch (err) {
  console.error("Test error:", err.message);
} finally {
  if (driver) await driver.quit();
  if (geckodriver) geckodriver.kill();
}
