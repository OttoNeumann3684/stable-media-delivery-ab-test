import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

export const deliveryRequest = z.object({
  assetId: z.string().min(1),
  creatorId: z.string().min(1),
  userId: z.string().min(1),
  flagKey: z.string().min(1)
});

export type DeliveryRequest = z.infer<typeof deliveryRequest>;

export function chooseStreamVariant(flagValue: unknown): "control" | "media-processing-v2" {
  if (typeof flagValue === "string" && flagValue === "media-processing-v2") return "media-processing-v2";
  if (typeof flagValue === "object" && flagValue !== null && "value" in flagValue && flagValue.value === "media-processing-v2") return "media-processing-v2";
  return "control";
}

export async function deliverMedia(input: unknown, client = new InfraiClient()) {
  const request = deliveryRequest.parse(input);
  await client.getUser(request.userId);
  const flagValue = await client.getFlagValue(request.flagKey, request.userId);
  const variant = chooseStreamVariant(flagValue);
  return { assetId: request.assetId, creatorId: request.creatorId, userId: request.userId, variant };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = deliveryRequest.parse({
    assetId: process.env.MEDIA_ASSET_ID ?? "asset-demo",
    creatorId: process.env.MEDIA_CREATOR_ID ?? "creator-demo",
    userId: process.env.MEDIA_USER_ID,
    flagKey: process.env.MEDIA_FLAG_KEY
  });
  deliverMedia(input).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
