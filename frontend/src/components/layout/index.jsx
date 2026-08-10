/**
 * Deprecated alias. `@/components/layout` used to be a second public shell
 * (legacy Navbar + Footer), which is one of the three competing navs this
 * codebase carried. It now re-exports the single shared shell so that any page
 * still importing it renders the same header/footer as everything else.
 *
 * Do not import this in new code — import `@/components/layout/PublicLayout`.
 * It exists only for `src/pages/jobs/apply/[id].jsx`, which is outside this
 * change's ownership boundary and must be migrated before this file is removed.
 */
export { default } from './PublicLayout';
