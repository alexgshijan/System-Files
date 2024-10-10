export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    const crypto = require('crypto');

    // Handle CORS preflight request (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://solarportal.alexgs.co.uk', 
          'Vary' : 'Origin',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400', 
        },
      });
    }

    // Handle POST request for user registration
    if (pathname === "/auth/register" && request.method === 'POST') {
      try {
        const body = await request.json();
        const { full_name, email_id, password, account_type } = body;

        if (!full_name || !email_id || !password || !account_type) {
          return new Response(
            JSON.stringify({ error: "Missing required fields." }),
            { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email_id)) {
          return new Response(
            JSON.stringify({ error: "Invalid email format." }),
            { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        const checkEmail = await env.solarportal.prepare(
          "SELECT COUNT(*) as count FROM users WHERE email_id = ?"
        ).bind(email_id).first();

        if (checkEmail.count > 0) {
          return new Response(
            JSON.stringify({ error: "Email is already in use." }),
            { status: 409, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        await env.solarportal.prepare(
          "INSERT INTO users (full_name, email_id, password_hashed account_type, hash) VALUES (?, ?, ?, ?, ?)"
        ).bind(full_name, email_id, password, account_type, hash).run();

        return new Response(
          JSON.stringify({ message: "User registered successfully." }),
          { status: 201, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );

      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Registration failed.", details: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // Handle POST request for user login
    if (pathname === "/auth/login" && request.method === 'POST') {
      try {
        const body = await request.json();
        const { email_id, password } = body;
        if (!email_id || !password) {
          return new Response(
            JSON.stringify({ error: "Missing email or password." }),
            { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        const user = await env.solarportal.prepare(
          "SELECT * FROM users WHERE email_id = ?"
        ).bind(email_id).first();

        if (!user || user.password !== password) {
          return new Response(
            JSON.stringify({ error: "Invalid login details" }),
            { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }

        // Return full_name and account_type upon successful login
        return new Response(
          JSON.stringify({ message: "Login successful.", full_name: user.full_name, account_type: user.account_type }),
          { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );

      } catch (error) {
        return new Response(
          JSON.stringify({ error: "Login failed.", details: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // Default response
    return new Response(
      JSON.stringify({ message: "Use /auth/register to register or /auth/login to login." }),
      { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  },
};
