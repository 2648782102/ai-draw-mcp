import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";

const panelSource = await fs.readFile(new URL("../src/infra/templates/index.html", import.meta.url), "utf8");

function loadViewportPublisher(options) {
  const start = panelSource.indexOf("function publishViewport()");
  const end = panelSource.indexOf("function scheduleViewportSync()", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const source = panelSource.slice(start, end);
  const globals = {
    API: "http://127.0.0.1:3399",
    PANEL_TOKEN: "panel_token_contract",
    zScale: 1.25,
    zX: -12,
    zY: 20,
    lastViewportPublished: null,
    fetch: options.fetch,
    navigator: options.navigator,
  };
  const factory = new Function(...Object.keys(globals), `${source}\nreturn publishViewport;`);
  return factory(...Object.values(globals));
}

describe("authenticated viewport publisher", () => {
  it("publishes a bounded human viewport with the panel token", async () => {
    const requests = [];
    const publisher = loadViewportPublisher({
      fetch: (url, request) => {
        requests.push({ url, request });
        return Promise.resolve({ ok: true });
      },
      navigator: {
        sendBeacon: () => {
          throw new Error("sendBeacon cannot send the panel token header");
        },
      },
    });

    await publisher();

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("http://127.0.0.1:3399/api/collab/viewport");
    expect(requests[0].request).toMatchObject({
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        "X-AI-Draw-Token": "panel_token_contract",
      },
    });
    expect(JSON.parse(requests[0].request.body)).toMatchObject({
      confirmedBy: "human",
      viewport: { version: 1, scale: 1.25, x: -12, y: 20, source: "human" },
    });
  });

  it("does not publish an identical viewport twice", async () => {
    const requests = [];
    const publisher = loadViewportPublisher({
      fetch: (url, request) => {
        requests.push({ url, request });
        return Promise.resolve({ ok: true });
      },
      navigator: {
        sendBeacon: () => {
          throw new Error("sendBeacon cannot send the panel token header");
        },
      },
    });

    await publisher();
    await publisher();

    expect(requests).toHaveLength(1);
  });
});
