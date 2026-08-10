// ---------------------------------------------------------------- Support
// There is no support-ticket backend yet. Rather than POST/GET against
// /api/users/support/* (which 404s), these resolve locally so the page never
// errors: the request list stays empty and submissions are accepted without a
// broken network call.
//
// Backlog: wire a real support backend (or email/helpdesk integration) so
// tickets are actually persisted and answered. Until then the page's success
// screen should be read as "we received your details" only once that exists.

// GET /api/users/support/tickets — no backend: resolve to an empty list so the
// page shows its honest empty state instead of an error.
export const getMyTickets = async () => [];

// POST /api/users/support/tickets — no backend sink: accept gracefully as a
// no-op. Returns no id so the page keeps its own local reference number.
export const createTicket = async (_payload) => ({ ok: false, persisted: false });

// POST /api/users/support/tickets/:id/reply — no backend: no-op.
export const replyToTicket = async (_ticketId, _text) => ({ ok: false, persisted: false });
