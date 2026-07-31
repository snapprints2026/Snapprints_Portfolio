import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const data = await req.json();

    await resend.emails.send({
      from: "SnapPrints <onboarding@resend.dev>",
      to: process.env.TO_EMAIL!,
      subject: "New SnapPrints Demo Request",

      html: `
<div style="font-family:Arial,sans-serif;padding:20px">
  <h2 style="color:#0ea5e9;">New SnapPrints Demo Request</h2>
  <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;">
    <tr><td><strong>Name</strong></td><td>${data.name}</td></tr>
    <tr><td><strong>Company</strong></td><td>${data.company}</td></tr>
    <tr><td><strong>Email</strong></td><td>${data.email}</td></tr>
    <tr><td><strong>Phone</strong></td><td>${data.phone}</td></tr>
    <tr><td><strong>City</strong></td><td>${data.city}</td></tr>
    <tr><td><strong>Organization</strong></td><td>${data.organization}</td></tr>
    <tr><td><strong>Message</strong></td><td>${data.message}</td></tr>
  </table>
</div>
`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Unable to send email" },
      { status: 500 }
    );
  }
}