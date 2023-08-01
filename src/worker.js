import apiRouter from './router';

// Export a default object containing event handlers
export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (url.pathname.startsWith('/api')) {
			return apiRouter.handle(request);
		}

		return new Response(
			`Invalid Request`,
			{ headers: { 'Content-Type': 'text/html', status: 400 } }
		);
	},
};
