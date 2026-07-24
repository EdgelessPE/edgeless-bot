# Kuwo Download Fallback Design

## Goal

Keep the Kuwo Music task working when its preferred official download channel
temporarily fails.

## Behavior

- Query the official Kuwo PC download API over HTTPS.
- Try channel `web_1` first to preserve current behavior.
- If the request fails or returns an invalid payload, try `web_2`, then `web_6`.
- Return the first valid download URL.
- Return an error only after all three official channels fail.

## Scope

Only the Kuwo external scraper and its tests will change. The shared network
helper, task configuration, producer, and other tasks will remain unchanged.

## Testing

Unit tests will inject a deterministic fetch function and verify:

- the preferred channel is returned without contacting fallbacks;
- a failed preferred channel falls back in order;
- an invalid payload also triggers fallback;
- all failed channels produce an error.
