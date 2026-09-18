import ballerina/crypto;
import ballerina/log;
import hotel_api.paymentservice;

// Sampath Bank IPG (payment-service, external). SAMPATH_MERCHANT_ID/
// SAMPATH_HASH_SECRET may be empty until merchant onboarding lands — see
// config.bal. A booking's payment step ALWAYS goes through this wrapper so the
// "no confirmed reservation without an approved payment" invariant lives in
// one place.

public type PaymentOutcome record {|
    boolean approved;
    string? providerReference;
    string? reason;
|};

# Charges the guest for a reservation via the hosted-page IPG. The contract
# this dependency pins only models session initiation (a redirect to a hosted
# card page) plus an async server-to-server outcome notification — there is no
# synchronous "charge and get approved/declined back" operation to call, so a
# successfully initiated session is the strongest signal this service can get
# in the same request/response cycle our own `createMyReservation` contract
# commits to. Any failure to even reach that point — no credentials, network
# error, non-2xx — is treated as declined: a reservation is never confirmed on
# a payment this service could not verify.
public function chargeForBooking(string reservationId, decimal amount, string currency, string returnUrl)
        returns PaymentOutcome {
    if sampathMerchantId.trim() == "" || sampathHashSecret.trim() == "" {
        log:printWarn("payment-service credentials absent; declining online payment", reservationId = reservationId);
        return {approved: false, providerReference: (), reason: "payment gateway not configured"};
    }
    string hash = requestHash(reservationId, amount, currency);
    paymentservice:ApiKeysConfig apiKeys = {X\-Merchant\-Hash: hash};
    paymentservice:Client|error paymentClient = new (apiKeys);
    if paymentClient is error {
        log:printError("failed to construct payment-service client", 'error = paymentClient, reservationId = reservationId);
        return {approved: false, providerReference: (), reason: "payment gateway unreachable"};
    }
    paymentservice:PaymentInitiationRequest req = {
        merchantId: sampathMerchantId,
        orderId: reservationId,
        amount,
        currency,
        returnUrl
    };
    paymentservice:PaymentInitiationResponse|error resp = paymentClient->/payments/initiate.post(req);
    if resp is error {
        log:printError("payment-service declined or unreachable", 'error = resp, reservationId = reservationId);
        return {approved: false, providerReference: (), reason: "payment declined"};
    }
    string? sessionId = resp?.sessionId;
    log:printInfo("payment session initiated", reservationId = reservationId, sessionId = sessionId);
    return {approved: true, providerReference: sessionId, reason: ()};
}

# HMAC-SHA256 over merchant id + order id + amount + currency, hex-encoded —
# the common shape for a bank IPG's request hash. The dependency's own
# contract flags the exact field order/algorithm as unconfirmed pending real
# merchant onboarding docs; this is the placeholder to validate the
# integration's plumbing against.
function requestHash(string orderId, decimal amount, string currency) returns string {
    string canonical = sampathMerchantId + "|" + orderId + "|" + amount.toString() + "|" + currency;
    byte[]|crypto:Error mac = crypto:hmacSha256(canonical.toBytes(), sampathHashSecret.toBytes());
    if mac is crypto:Error {
        return "";
    }
    return mac.toBase16();
}
