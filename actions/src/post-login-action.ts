// Minimal custom types until Auth0 publishes official ones for Actions.
type PostLoginAPI = {
  access: { deny: (message: string) => void };
};

type Event = {
  user: { email_verified?: boolean };
  client: { name?: string };
};

export const onExecutePostLogin = async (event: Event, api: PostLoginAPI) => {
  if (!event.user?.email_verified) {
    api.access.deny('Please verify your email address to continue.');
  }
};

// (Optional) export onContinuePostLogin etc, if needed in future.
