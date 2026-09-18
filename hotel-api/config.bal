import ballerina/os;

// hotel-db (platform-resource: postgres-cnpg) — wiring is verbatim from design.json
configurable string hotelDbHost = os:getEnv("HOTEL_DB_HOST");
configurable string hotelDbPort = os:getEnv("HOTEL_DB_PORT");
configurable string hotelDbName = os:getEnv("HOTEL_DB_DBNAME");
configurable string hotelDbUser = os:getEnv("HOTEL_DB_USER");
configurable string hotelDbPassword = os:getEnv("HOTEL_DB_PASSWORD");

// payment-service (external: Sampath Bank IPG) — may be empty; degrade gracefully
configurable string sampathMerchantId = os:getEnv("SAMPATH_MERCHANT_ID");
configurable string sampathHashSecret = os:getEnv("SAMPATH_HASH_SECRET");

// ota-channel-service (external: Booking.com Connectivity API) — may be empty
configurable string bookingHotelId = os:getEnv("BOOKING_HOTEL_ID");
configurable string bookingApiUsername = os:getEnv("BOOKING_API_USERNAME");
configurable string bookingApiPassword = os:getEnv("BOOKING_API_PASSWORD");

// email-service (external: SendGrid) — may be empty
configurable string sendgridApiKey = os:getEnv("SENDGRID_API_KEY");
configurable string sendgridFromEmail = os:getEnv("SENDGRID_FROM_EMAIL");

// whatsapp-service (external: Twilio) — may be empty
configurable string twilioAccountSid = os:getEnv("TWILIO_ACCOUNT_SID");
configurable string twilioAuthToken = os:getEnv("TWILIO_AUTH_TOKEN");
configurable string twilioWhatsappFrom = os:getEnv("TWILIO_WHATSAPP_FROM");
