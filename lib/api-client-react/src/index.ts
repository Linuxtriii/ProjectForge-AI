import { setBaseUrl } from "./custom-fetch";

export * from "./generated/api";
export * from "./generated/api.schemas";
export { setBaseUrl, setAuthTokenGetter } from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";

setBaseUrl("http://localhost:3001");