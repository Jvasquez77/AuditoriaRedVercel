/**
 * Proxy de API para producción (Vercel).
 *
 * En desarrollo, el proxy de Vite intercepta /api y /media antes de que
 * lleguen aquí, por lo que este archivo no tiene efecto en local.
 *
 * En producción (Vercel), no hay Vite, así que SvelteKit recibe todas las
 * peticiones. Este hook reenvía /api/* y /media/* al backend configurado
 * en la variable de entorno BACKEND_URL.
 */

import type { Handle } from '@sveltejs/kit';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8000';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname, search } = event.url;

	if (pathname.startsWith('/api') || pathname.startsWith('/media')) {
		const targetUrl = `${BACKEND}${pathname}${search}`;

		const init: RequestInit = { method: event.request.method };

		// Reenviar Content-Type si está presente
		const contentType = event.request.headers.get('content-type');
		if (contentType) {
			init.headers = { 'content-type': contentType };
		}

		// Reenviar body en métodos que lo admiten
		if (!['GET', 'HEAD'].includes(event.request.method)) {
			init.body = await event.request.arrayBuffer();
		}

		const upstream = await fetch(targetUrl, init);

		return new Response(upstream.body, {
			status: upstream.status,
			headers: {
				'content-type': upstream.headers.get('content-type') ?? 'application/json',
				'cache-control': upstream.headers.get('cache-control') ?? 'no-store',
			},
		});
	}

	return resolve(event);
};
