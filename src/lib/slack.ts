import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { formatDayLabel } from "@/lib/days-format";

function getAppUrl(): string {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function formatRequestDates(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = sameYear ? "d MMM" : "d MMM yyyy";
  const endFmt = "d MMM yyyy";
  const startLabel = format(start, startFmt);
  const endLabel = format(end, endFmt);
  return startLabel === endLabel ? endLabel : `${startLabel} – ${endLabel}`;
}

export async function notifySlackNewVacationRequest(requestId: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  const request = await prisma.vacationRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          teamMembers: {
            orderBy: { createdAt: "asc" },
            take: 1,
            include: { team: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!request) return;

  const displayName = request.user.name ?? request.user.email;
  const teamName = request.user.teamMembers[0]?.team.name ?? "No team";
  const dateRange = formatRequestDates(request.startDate, request.endDate);
  const daysLabel = formatDayLabel(request.days);
  const approvalsUrl = `${getAppUrl()}/approvals`;

  const noteBlock = request.note
    ? [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Note:*\n${request.note}`,
          },
        },
      ]
    : [];

  const payload = {
    text: `New vacation request from ${displayName}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "New vacation request", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Employee:*\n${displayName}` },
          { type: "mrkdwn", text: `*Team:*\n${teamName}` },
          { type: "mrkdwn", text: `*Dates:*\n${dateRange}` },
          { type: "mrkdwn", text: `*Duration:*\n${daysLabel}` },
        ],
      },
      ...noteBlock,
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Review in Hols", emoji: true },
            url: approvalsUrl,
            style: "primary",
          },
        ],
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Slack webhook failed (${response.status}): ${body}`);
  }
}
