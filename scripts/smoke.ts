import { predictAll } from "../netlify/lib/cadence/model";
import {
  DEFAULT_SKUS,
  generateSyntheticHistory,
} from "../netlify/lib/cadence/synthetic";
import { FakeMCPClient } from "../netlify/lib/mcp/fake";

interface Check {
  name: string;
  passed: boolean;
  detail: string;
}

const checks: Check[] = [];

function check(name: string, passed: boolean, detail = "") {
  checks.push({ name, passed, detail });
}

async function runCadenceChecks() {
  const now = new Date();
  const { observations } = generateSyntheticHistory({
    seed: 42,
    now,
    historyDays: 90,
    skus: DEFAULT_SKUS,
    foodOrdersPerWeek: 3,
  });
  const predictions = predictAll(observations, undefined, now);
  const bySku = Object.fromEntries(predictions.map((p) => [p.sku, p]));

  const expectedRanges: Record<string, [number, number]> = {
    "milk-1l": [2, 5],
    "bread-400g": [3, 7],
    "eggs-12": [5, 10],
    "atta-5kg": [15, 28],
    "rice-5kg": [22, 38],
  };

  for (const [sku, [lo, hi]] of Object.entries(expectedRanges)) {
    const c = bySku[sku]?.cadenceDays;
    check(
      `cadence: ${sku} in [${lo}, ${hi}] days`,
      c !== null && c !== undefined && c >= lo && c <= hi,
      c == null ? "no prediction" : `cadenceDays=${c.toFixed(2)}`,
    );
  }

  check(
    "cadence: all SKUs have nextNeedDate",
    predictions.every((p) => p.nextNeedDate !== null),
    predictions
      .filter((p) => p.nextNeedDate === null)
      .map((p) => p.sku)
      .join(",") || "all set",
  );

  check(
    "cadence: rice cadence > milk cadence",
    (bySku["rice-5kg"]?.cadenceDays ?? 0) >
      (bySku["milk-1l"]?.cadenceDays ?? 0),
    `rice=${bySku["rice-5kg"]?.cadenceDays?.toFixed(2)}, milk=${bySku["milk-1l"]?.cadenceDays?.toFixed(2)}`,
  );

  check(
    "cadence: dampening applied (food orders generated)",
    predictions.some((p) => p.dampeningDays > 0),
    `max dampening=${Math.max(...predictions.map((p) => p.dampeningDays))}`,
  );
}

async function runMCPChecks() {
  const client = new FakeMCPClient();
  await client.connect();
  try {
    const orders = await client.getInstamartOrders();
    check(
      "mcp(fake): getInstamartOrders returns 2 orders",
      orders.length === 2,
      `got ${orders.length}`,
    );
    check(
      "mcp(fake): orders have items",
      orders.every((o) => o.items.length > 0),
      `items lengths: ${orders.map((o) => o.items.length).join(",")}`,
    );

    const food = await client.getFoodOrders();
    check(
      "mcp(fake): getFoodOrders returns 1 order",
      food.length === 1,
      `got ${food.length}`,
    );

    const search = await client.searchInstamartProducts({
      addressId: "fake",
      query: "milk",
    });
    check(
      "mcp(fake): searchInstamartProducts returns at least 1 product",
      search.length >= 1,
      `got ${search.length}`,
    );

    const cart = await client.updateInstamartCart({
      items: [
        { productId: "milk-1l", quantity: 2 },
        { productId: "bread-400g", quantity: 1 },
      ],
    });
    check(
      "mcp(fake): updateInstamartCart reflects added items",
      cart.items.length === 2 && (cart.totalAmount ?? 0) > 0,
      `items=${cart.items.length}, total=${cart.totalAmount}`,
    );

    const callToolResult = await client.callTool("get_orders");
    check(
      "mcp(fake): raw callTool dispatches correctly",
      Array.isArray(callToolResult) &&
        (callToolResult as unknown[]).length === 2,
      `length=${Array.isArray(callToolResult) ? callToolResult.length : "n/a"}`,
    );
  } finally {
    await client.close();
  }
}

async function main() {
  await runCadenceChecks();
  await runMCPChecks();

  let failures = 0;
  for (const c of checks) {
    const mark = c.passed ? "ok" : "FAIL";
    console.log(`[${mark}] ${c.name}${c.detail ? `  (${c.detail})` : ""}`);
    if (!c.passed) failures++;
  }
  console.log(`\n${checks.length - failures}/${checks.length} passed`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
