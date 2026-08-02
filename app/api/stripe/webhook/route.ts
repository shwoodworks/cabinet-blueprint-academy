// app/api/stripe/webhook/route.ts
//
// Stripe calls this URL after someone pays via a Stripe Payment Link.
// Register it in the Stripe dashboard: Developers > Webhooks > Add endpoint
//   URL:   https://<your-live-domain>/api/stripe/webhook
//   Event: checkout.session.completed
// Stripe gives you a signing secret on that screen, set it as the
// STRIPE_WEBHOOK_SECRET environment variable in Vercel.
//
// The Enroll button on the overview page should link straight to the
// class's Stripe Payment Link, with the course's ID appended as
// client_reference_id, e.g.:
//   https://buy.stripe.com/xxxxxxxx?client_reference_id=e20fa0d7-bcd8-4b0c-add5-c88b4fceb5a1
// That ID is how this webhook knows which course to enroll them in.
//
// No new npm packages are required: signature verification is done with
// Node's built-in crypto module, and account/enrollment creation reuses
// the existing lib/supabase/admin service-role client, matching the same
// invite pattern as app/actions/admin.ts inviteStudent (which is the
// admin-side, no-payment way to invite someone into a course).

import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "node:crypto";

export const runtime = "nodejs";

function isValidStripeSignature(
    payload: string,
    sigHeader: string,
    secret: string,
    toleranceSeconds = 300
  ): boolean {
    const parts = Object.fromEntries(
          sigHeader.split(",").map((kv) => {
                  const [k, v] = kv.split("=");
                  return [k, v];
          })
        );
    const timestamp = parts["t"];
    const v1 = parts["v1"];
    if (!timestamp || !v1) return false;

  const signedPayload = `${timestamp}.${payload}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(signedPayload, "utf8")
      .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(v1, "hex");
    if (expectedBuf.length !== actualBuf.length) return false;
    if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
    return age <= toleranceSeconds;
}

export async function POST(req: Request) {
  const payload = await req.text();
  const sigHeader = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

if (!sigHeader || !secret || !isValidStripeSignature(payload, sigHeader, secret)) {
  return new Response("Invalid signature", { status: 400 });
}

const event = JSON.parse(payload);

if (event.type === "checkout.session.completed") {
  const session = event.data.object;
  const email: string | undefined = session.customer_details?.email;
  const fullName: string | undefined = session.customer_details?.name;
  const courseId: string | undefined = session.client_reference_id;

  if (!email || !courseId) {
    console.error("Missing email or client_reference_id on checkout session", session.id);
    return Response.json({ received: true });
  }

  const adminClient = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cabinet-blueprint-academy.vercel.app";

  try {
    let userId: string | undefined;

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${siteUrl}/update-password?type=invite` }
    );

  if (inviteError) {
    const { data: existingUser } = await adminClient
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

    if (!existingUser) {
      console.error("Invite failed and no existing user found:", inviteError.message);
      return Response.json({ received: true });
    }
    userId = existingUser.id;
  } else {
    if (!invited?.user) {
      console.error("Invite did not return a user for", email);
      return Response.json({ received: true });
    }
    userId = invited.user.id;

    const { error: profileError } = await adminClient.from("users").insert({
      id: userId,
      email,
      full_name: fullName ?? null,
      role: "learner",
    });

    if (profileError) {
      console.error("Failed to create profile row:", profileError.message);
    }
  }

  const { error: enrollError } = await adminClient.from("enrollments").insert({
    user_id: userId,
    course_id: courseId,
  });

  if (enrollError && !enrollError.message.includes("duplicate")) {
    console.error("Enrollment insert failed:", enrollError.message);
  }
  } catch (err) {
    console.error("Error provisioning account/enrollment:", err);
  }
}

return Response.json({ received: true });
}
