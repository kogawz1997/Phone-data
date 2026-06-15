export type NotificationChannel = "LINE" | "SMS" | "EMAIL" | "IN_APP";

export type NotificationResult = {
  success: boolean;
  channel: NotificationChannel;
  providerRef?: string;
  message?: string;
  raw?: unknown;
};

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const raw = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!response.ok) throw new Error(`Notification provider failed ${response.status}: ${text}`);
  return raw;
}

export async function sendNotification(input: {
  channel: NotificationChannel;
  to: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<NotificationResult> {
  const provider = (process.env.NOTIFICATION_PROVIDER ?? "local").toLowerCase();

  if (provider === "line" && input.channel === "LINE") {
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is required");
    const raw = await postJson("https://api.line.me/v2/bot/message/push", {
      to: input.to,
      messages: [{ type: "text", text: input.message }],
    }, { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` });
    return { success: true, channel: input.channel, providerRef: "line-push", message: "LINE message sent", raw };
  }

  if (provider === "webhook") {
    if (!process.env.NOTIFICATION_WEBHOOK_URL) throw new Error("NOTIFICATION_WEBHOOK_URL is required");
    const raw = await postJson(process.env.NOTIFICATION_WEBHOOK_URL, {
      channel: input.channel,
      to: input.to,
      message: input.message,
      metadata: input.metadata ?? {},
    }, process.env.NOTIFICATION_WEBHOOK_SECRET ? { "x-koga-webhook-secret": process.env.NOTIFICATION_WEBHOOK_SECRET } : {});
    return { success: true, channel: input.channel, providerRef: "webhook", message: "Notification webhook sent", raw };
  }

  return {
    success: true,
    channel: input.channel,
    providerRef: `local_${input.channel.toLowerCase()}_${Date.now()}`,
    message: `Notification recorded locally for ${input.to}: ${input.message}`,
  };
}

// Backward compatible export for old imports.
export const sendMockNotification = sendNotification;
