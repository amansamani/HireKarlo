export function verifyEmailTemplate(name: string, verifyUrl: string) {
  return {
    subject: "Verify your email — HireKarlo",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; color: #18181b;">
        <h2 style="margin-bottom: 4px;">Hi ${name},</h2>
        <p style="color: #52525b; line-height: 1.6;">Thanks for signing up. Confirm your email address to activate your recruiter account.</p>
        <div style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background: #18181b; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Verify email</a>
        </div>
        <p style="color: #a1a1aa; font-size: 12px; line-height: 1.6;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px;">— The Hiring Team</p>
      </div>
    `,
  };
}

export function stageChangeEmail(candidateName: string, jobTitle: string, newStage: string) {
  const messages: Record<string, { subject: string; body: string }> = {
    SCREENING: {
      subject: `Update on your application for ${jobTitle}`,
      body: `Your application is now under review by our team.`,
    },
    TECHNICAL: {
      subject: `Technical interview stage — ${jobTitle}`,
      body: `Good news — you've moved to the technical interview stage. We'll be in touch shortly to schedule a time.`,
    },
    HR: {
      subject: `HR round — ${jobTitle}`,
      body: `You've progressed to the HR round for this role. We'll reach out soon with next steps.`,
    },
    OFFER: {
      subject: `An offer for ${jobTitle}!`,
      body: `Congratulations — we'd like to extend you an offer for this position. Our team will follow up with details.`,
    },
    HIRED: {
      subject: `Welcome aboard — ${jobTitle}!`,
      body: `Congratulations, and welcome to the team! We're thrilled to have you join us as our new ${jobTitle}. Our team will be in touch shortly with onboarding details.`,
    },
    REJECTED: {
      subject: `Update on your application for ${jobTitle}`,
      body: `Thank you for your interest in this role. After careful consideration, we've decided to move forward with other candidates at this time. We appreciate you applying and encourage you to apply for future openings.`,
    },
  };

  const content = messages[newStage] ?? {
    subject: `Update on your application for ${jobTitle}`,
    body: `Your application status has been updated.`,
  };

  return {
    subject: content.subject,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; color: #18181b;">
        <h2 style="margin-bottom: 4px;">Hi ${candidateName},</h2>
        <p style="color: #52525b; line-height: 1.6;">${content.body}</p>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px;">— The Hiring Team</p>
      </div>
    `,
  };
}

export function applicationOtpEmail(otp: string, jobTitle: string) {
  return {
    subject: `Your verification code: ${otp}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; color: #18181b;">
        <h2 style="margin-bottom: 4px;">Verify your email</h2>
        <p style="color: #52525b; line-height: 1.6;">Use this code to confirm your email address before applying for <strong>${jobTitle}</strong>:</p>
        <div style="margin: 24px 0; text-align: center;">
          <span style="display: inline-block; background: #f4f4f5; border-radius: 8px; padding: 14px 28px; font-size: 28px; font-weight: 700; letter-spacing: 6px;">${otp}</span>
        </div>
        <p style="color: #a1a1aa; font-size: 12px; line-height: 1.6;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px;">— The Hiring Team</p>
      </div>
    `,
  };
}

export function interviewScheduledEmail(
  candidateName: string,
  jobTitle: string,
  round: string,
  interviewer: string,
  scheduledAt: Date
) {
  const formattedDate = scheduledAt.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return {
    subject: `Interview scheduled — ${jobTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px; color: #18181b;">
        <h2 style="margin-bottom: 4px;">Hi ${candidateName},</h2>
        <p style="color: #52525b; line-height: 1.6;">Your ${round} for the <strong>${jobTitle}</strong> role has been scheduled.</p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>When:</strong> ${formattedDate}</p>
          <p style="margin: 4px 0;"><strong>With:</strong> ${interviewer}</p>
        </div>
        <p style="color: #52525b; line-height: 1.6;">We look forward to speaking with you.</p>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px;">— The Hiring Team</p>
      </div>
    `,
  };
}