import ballerina/crypto;
import ballerina/http;
import ballerina/jwt;
import ballerina/test;

// Exercises the gateway-assertion interceptor (gateway_assertion.bal) against
// a throwaway RSA keypair — never a real gateway or IdP. Before `bal test`
// runs, the three trust-anchor variables must be exported from the checked-in
// test certificate (tests/resources/gateway-cert.pem), matching the constants
// below:
//
//   export GATEWAY_ASSERTION_CERTIFICATE="$(cat tests/resources/gateway-cert.pem)"
//   export GATEWAY_ASSERTION_ISSUER="hotel-api-test-gateway"
//   export GATEWAY_ASSERTION_HEADER="x-jwt-assertion"
//
// Without the full trio the interceptor falls back to its unverified mode
// (see gateway_assertion.bal's banner) and every case below fails for a
// reason the test output does not name.

const string TEST_HEADER = "x-jwt-assertion";
const string TEST_ISSUER = "hotel-api-test-gateway";
const string GATEWAY_KEY_FILE = "tests/resources/gateway-key.pem";
const string WRONG_KEY_FILE = "tests/resources/wrong-key.pem";

final http:Client testClient = check new ("http://localhost:9090");

function mintAssertion(string keyFile, string sub, string scope) returns string {
    crypto:PrivateKey|crypto:Error key = crypto:decodeRsaPrivateKeyFromKeyFile(keyFile);
    if key is crypto:Error {
        test:assertFail("failed to decode test private key " + keyFile + ": " + key.message());
    }
    jwt:IssuerConfig issuerConfig = {
        issuer: TEST_ISSUER,
        username: sub,
        expTime: 300,
        customClaims: {"scope": scope, "ouHandle": "test-org", "username": "tester"},
        signatureConfig: {algorithm: jwt:RS256, config: key}
    };
    string|jwt:Error token = jwt:issue(issuerConfig);
    if token is jwt:Error {
        test:assertFail("failed to mint test JWT: " + token.message());
    }
    return token;
}

@test:Config {}
function testPublicResourceNeedsNoAssertion() returns error? {
    // /health is `security: []` in openapi.yaml — no assertion, still 200.
    http:Response resp = check testClient->get("/health");
    test:assertEquals(resp.statusCode, 200);
}

@test:Config {}
function testValidAssertionIsAccepted() returns error? {
    string token = mintAssertion(GATEWAY_KEY_FILE, "guest-1", "reservations:read");
    map<string|string[]> headers = {};
    headers[TEST_HEADER] = token;
    http:Response resp = check testClient->get("/me/reservations", headers);
    // Never 401 for a valid, correctly-signed assertion. (500 is possible only
    // if this environment has no reachable hotel-db — a separate concern from
    // assertion verification, which is what this test targets.)
    test:assertNotEquals(resp.statusCode, 401);
}

@test:Config {}
function testAssertionSignedByWrongKeyIs401() returns error? {
    string token = mintAssertion(WRONG_KEY_FILE, "guest-2", "reservations:read");
    map<string|string[]> headers = {};
    headers[TEST_HEADER] = token;
    http:Response resp = check testClient->get("/me/reservations", headers);
    test:assertEquals(resp.statusCode, 401);
}

@test:Config {}
function testTamperedAssertionIs401() returns error? {
    string token = mintAssertion(GATEWAY_KEY_FILE, "guest-3", "reservations:read");
    string[] parts = re `\.`.split(token);
    test:assertEquals(parts.length(), 3);
    string payload = parts[1];
    string flipped = payload.endsWith("A") ? "B" : "A";
    string tamperedPayload = payload.length() > 0 ? payload.substring(0, payload.length() - 1) + flipped : flipped;
    string tamperedToken = parts[0] + "." + tamperedPayload + "." + parts[2];
    map<string|string[]> headers = {};
    headers[TEST_HEADER] = tamperedToken;
    http:Response resp = check testClient->get("/me/reservations", headers);
    // Never treated as anonymous — a tampered assertion is always a 401, not
    // a fall-through to "no caller".
    test:assertEquals(resp.statusCode, 401);
}
