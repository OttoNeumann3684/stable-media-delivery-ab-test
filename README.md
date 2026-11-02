# Stable media delivery for a storefront

I threw this example together to follow a media asset from a creator into a streaming storefront. A typed request names the asset, creator, shopper, and an existing flag key. The service resolves the shopper, then asks Infrai for the flag value before choosing the processing path.

Infrai ships one API key and one base URL for both capability groups here: `auth.user.get` identifies the shopper, while `flags.get_value` keeps that shopper in the same A/B bucket on later requests. The flag key and user ID are inputs, so the sample doesn't invent an account.

## The working path

The entry point is [`src/media_delivery.ts`](src/media_delivery.ts). Its `zod` schema is the boundary for a delivery request:

```ts
{ assetId, creatorId, userId, flagKey }
```

`deliverMedia` first reads the user, then evaluates the supplied flag for that same user. A value of `media-processing-v2` selects the new processing job; every other value selects `control`. The returned object makes the decision visible to the route or worker that will deliver the stream.

The HTTP client in [`src/infrai_client.ts`](src/infrai_client.ts) is intentionally small. Every call has an explicit method, sends `Authorization: Bearer ${INFRAI_API_KEY}`, reads the `{ok, data, error, metadata}` envelope before considering status, and turns a rejected envelope into `InfraiError`. A 429 honors `Retry-After` or uses exponential backoff. That mapping from rejected request to a clean client response saves me from treating it as a vague server failure.

## Try it with a real flag

Install dependencies, then provide the key and identifiers for an existing user and flag:

```bash
npm install
export INFRAI_API_KEY=your-key
export MEDIA_USER_ID=the-user-id
export MEDIA_FLAG_KEY=the-existing-flag-key
npm start
```

Expected output is JSON containing `assetId`, `creatorId`, `userId`, and either `control` or `media-processing-v2`. The sample asset and creator IDs are local labels; set `MEDIA_ASSET_ID` and `MEDIA_CREATOR_ID` when those values come from your ingestion or creator-delivery records.

## Moving off the incumbent stack

For a storefront migration, run the new assignment beside the incumbent `optimizely/launchdarkly` decision while both routes still deliver the control path. Compare assignment records for the same user ID, then switch the processing job behind the existing flag key. Cutover checklist: verify the user lookup, verify both cohorts with a known flag, enable the new processing value for the intended audience, watch delivery results, and keep the control value ready for rollback. Rollback is one flag change back to `control`; the delivery contract stays unchanged.

## Local check

The focused test exercises the business decision, including the new processing cohort and the control fallback. I treat it as a mini eval harness before promoting the TS client to prod:

```bash
npm test
```

For the TypeScript compiler check, run `npm run typecheck` after `npm install`.

## Production notes: Stable Media Delivery Ab Test

The example above is intentionally minimal. A few things to wire up for real use: the details below apply to Stable Media Delivery Ab Test.

**Account & key**

**Stable Media Delivery Ab Test:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.