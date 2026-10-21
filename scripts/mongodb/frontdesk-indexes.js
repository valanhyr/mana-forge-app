// Run manually in mongosh against the intended database after reviewing the target.
// No connection URI, credentials, database switch, deletes, or data migration.
db.support_tickets.createIndex({ updatedAt: -1, _id: -1 }, { name: "frontdesk_tickets_recent" });
db.support_tickets.createIndex({ status: 1, priority: 1, updatedAt: -1, _id: -1 }, { name: "frontdesk_tickets_triage" });
db.support_tickets.createIndex({ userId: 1, status: 1 }, { name: "frontdesk_tickets_user_status" });
db.support_tickets.createIndex({ userEmail: 1 }, { name: "frontdesk_tickets_email" });
db.audit_events.createIndex({ timestamp: -1, _id: -1 }, { name: "frontdesk_audit_recent" });
db.audit_events.createIndex({ targetUserId: 1, timestamp: -1, _id: -1 }, { name: "frontdesk_audit_user" });
db.audit_events.createIndex({ action: 1, timestamp: -1, _id: -1 }, { name: "frontdesk_audit_action" });
db.email_deliveries.createIndex({ createdAt: -1, _id: -1 }, { name: "frontdesk_deliveries_recent" });
db.email_deliveries.createIndex({ ticketId: 1, createdAt: -1, _id: -1 }, { name: "frontdesk_deliveries_ticket" });
db.users.createIndex({ username: 1, _id: 1 }, { name: "frontdesk_users_list" });
db.decks.createIndex({ userId: 1, updatedAt: -1, _id: -1 }, { name: "frontdesk_user_decks" });
db.support_tickets.createIndex({ userId: 1, customerVisible: 1, updatedAt: -1, _id: -1 }, { name: "customer_support_inbox" });
db.users.createIndex({ newsletterSubscribed: 1, validated: 1, username: 1, _id: 1 }, { name: "newsletter_subscribers" });
db.users.createIndex({ newsletterTokenHash: 1 }, { name: "newsletter_unsubscribe_token", unique: true, partialFilterExpression: { newsletterTokenHash: { $type: "string" } } });
db.newsletter_campaigns.createIndex({ createdAt: -1, _id: -1 }, { name: "newsletter_campaigns_recent" });
db.email_deliveries.createIndex({ campaignId: 1, createdAt: -1 }, { name: "newsletter_campaign_deliveries" });
