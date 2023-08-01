import { Router, json } from 'itty-router';
import {
	login,
	edit,
	reply,
	create,
} from './action';

const router = Router({ base: '/api'});

router.get('/', () => json({message: "OK"}));

router.post('/login', async (request) => {
	let requestBody;
	try {
		requestBody = await request.json();
	} catch (error) {
		return json(formatResponse(false, 'Invalid Request'), { status: 400 });
	}

	const { username, password } = requestBody;
	let result;
	try {
		result = await login(username, password);
	} catch (e) {
		console.log(e);
		return json(formatResponse(false, 'Login Failed'), { status: 401 });
	}

	return json(formatResponse(true, 'Login success', {cdb_auth: result}));
});

router.post('/create', async (request) => {
	let requestBody;
	try {
		requestBody = await request.json();
	} catch (error) {
		return json(formatResponse(false, 'Invalid Request'), { status: 400 });
	}

	const { cdb_auth, options, postParams } = requestBody;
	let result;
	try {
		result = await create(cdb_auth, options, postParams);
	} catch (e) {
		console.log(e);
		return json(formatResponse(false, 'Post Failed'), { status: 401 });
	}

	return json(formatResponse(true, 'Post Success', result));
});

router.post('/edit', async (request) => {
	let requestBody;
	try {
		requestBody = await request.json();
	} catch (error) {
		return json(formatResponse(false, 'Invalid Request'), { status: 400 });
	}

	const { cdb_auth, options, postParams } = requestBody;
	let result;
	try {
		result = await edit(cdb_auth, options, postParams);
	} catch (e) {
		console.log(e);
		return json(formatResponse(false, 'Post Failed'), { status: 401 });
	}

	return json(formatResponse(true, 'Post Success', result));
});

router.post('/reply', async (request) => {
	let requestBody;
	try {
		requestBody = await request.json();
	} catch (error) {
		return json(formatResponse(false, 'Invalid Request'), { status: 400 });
	}

	const { cdb_auth, options, postParams } = requestBody;
	let result;
	try {
		result = await reply(cdb_auth, options, postParams);
	} catch (e) {
		console.log(e);
		return json(formatResponse(false, 'Post Failed'), { status: 401 });
	}

	return json(formatResponse(true, 'Post Success', result));
});

// 404 for everything else
router.all('*', () => json(formatResponse(false, 'Not Found'), { status: 404 }));

const formatResponse = (success, message, value) => ({
  success,
  message,
  value
});

export default router;
