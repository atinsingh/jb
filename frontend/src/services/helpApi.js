// ---------------------------------------------------------------- Help center
// Help content is bundled static in the frontend (HELP_ARTICLES / HELP_CATEGORIES
// on the page). There is no backend articles endpoint, so these resolve locally
// (no network) instead of 404-ing against /api/users/help/*.
//
// getHelpArticles resolves to null so the page keeps its bundled content; a real
// CMS-backed help endpoint can replace this later. (Backlog.)
export const getHelpArticles = async () => null;

// Feedback has no backend sink yet — accept it gracefully as a no-op so votes
// never surface an error to the user. (Backlog: persist help feedback.)
export const submitArticleFeedback = async (_articleId, _vote) => ({ ok: true });
