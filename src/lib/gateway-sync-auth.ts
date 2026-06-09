export function verifyGatewaySync(request: Request): boolean {
  const secret = process.env.GATEWAY_SYNC_SECRET;
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
