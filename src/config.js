export const SUPABASE_URL = 'https://ipxbndockmhkfuwjyevi.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_VatpUfqGmaOnMBMvbEr8sQ_mmhphftT';
export const SITE_BASE_URL = 'https://edward-stapleton.github.io/wedding/';
export const RSVP_ROUTE_PATH = 'rsvp/';
export const RSVP_ROUTE_URL = new URL(RSVP_ROUTE_PATH, SITE_BASE_URL).toString();
export const isRsvpRoute = window.location.pathname.includes(`/${RSVP_ROUTE_PATH}`);
export const EMAIL_STORAGE_KEY = 'weddingGuestEmail';
export const INVITE_TOKEN_STORAGE_KEY = 'weddingInviteToken';
export const INVITE_TYPE_STORAGE_KEY = 'weddingInviteType';
export const RSVP_COMPLETED_KEY_PREFIX = 'weddingRsvpCompleted:';
export const RSVP_ACCESS_STORAGE_KEY = 'weddingRsvpAccessEmail';
export const INVITE_TYPE_QUERY_KEY = 'invite';
export const RSVP_PASSWORD = 'STARFORD';
export const MAPBOX_TOKEN =
  'pk.eyJ1IjoiZWR3YXJkc3RhcGxldG9uIiwiYSI6ImNtaGwyMWE2YzBjbzcyanNjYms4ZTduMWoifQ.yo7R9MXXEfna7rzmFk2rQg';
export const MAPBOX_DEFAULT_STYLE = 'mapbox://styles/mapbox/standard?optimize=true';
