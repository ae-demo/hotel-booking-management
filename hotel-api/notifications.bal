import ballerina/log;
import hotel_api.emailservice;
import hotel_api.whatsappservice;

// email-service (SendGrid) and whatsapp-service (Twilio), both external. Both
// are best-effort side effects of a reservation being created or cancelled:
// their credentials may be absent, and either call may fail. Neither ever
// blocks or reverses the reservation itself — a notification failure is
// logged and swallowed here, never surfaced as a booking failure.

# Sends the always-on confirmation/cancellation email. Silently declines (with
# a log line) when SENDGRID_API_KEY/SENDGRID_FROM_EMAIL are not configured.
public function sendBookingEmail(string toEmail, string toName, string subject, string body) {
    if toEmail.trim() == "" {
        return;
    }
    if sendgridApiKey.trim() == "" || sendgridFromEmail.trim() == "" {
        log:printWarn("email-service not configured; skipping guest email", toEmail = toEmail);
        return;
    }
    emailservice:ConnectionConfig connConfig = {auth: {token: sendgridApiKey}};
    emailservice:Client|error emailClient = new (connConfig);
    if emailClient is error {
        log:printError("failed to construct email-service client", 'error = emailClient);
        return;
    }
    emailservice:MailFrom mailFrom = {email: sendgridFromEmail, name: "Hotel Booking"};
    emailservice:MailTo mailTo = {email: toEmail, name: toName};
    error? result = emailClient->/v3/mail/send.post({
        personalizations: [{to: [mailTo], subject}],
        'from: mailFrom,
        subject,
        content: [{'type: "text/plain", value: body}]
    });
    if result is error {
        log:printError("email-service send failed", 'error = result, toEmail = toEmail);
        return;
    }
    log:printInfo("booking email sent", toEmail = toEmail);
}

# Sends the optional WhatsApp confirmation/cancellation message, only when the
# guest opted in. Silently declines when TWILIO_* is not configured.
public function sendBookingWhatsapp(boolean optedIn, string? toPhone, string body) {
    if !optedIn || toPhone is () || toPhone.trim() == "" {
        return;
    }
    if twilioAccountSid.trim() == "" || twilioAuthToken.trim() == "" || twilioWhatsappFrom.trim() == "" {
        log:printWarn("whatsapp-service not configured; skipping guest WhatsApp message");
        return;
    }
    whatsappservice:ConnectionConfig connConfig = {auth: {username: twilioAccountSid, password: twilioAuthToken}};
    whatsappservice:Client|error waClient = new (connConfig);
    if waClient is error {
        log:printError("failed to construct whatsapp-service client", 'error = waClient);
        return;
    }
    whatsappservice:AccountSid_Messages_json_body payload = {
        To: "whatsapp:" + toPhone,
        From: twilioWhatsappFrom,
        Body: body
    };
    whatsappservice:Message|error result = waClient->sendWhatsappMessage(twilioAccountSid, payload);
    if result is error {
        log:printError("whatsapp-service send failed", 'error = result);
        return;
    }
    log:printInfo("booking WhatsApp message sent", sid = result?.sid);
}
