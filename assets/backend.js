export default {
    async fetch(request, env) {
      const { pathname } = new URL(request.url);
  
      // Handle CORS preflight request (OPTIONS)
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Vary' : "Origin",
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400', // Cache the preflight for 1 day
          },
        });
      }
  
  // Handle POST request for user registration
    if (pathname === "/auth/register" && request.method === 'POST') {
      try {
        const body = await request.json();
        const { first_name, last_name, email_id, password, account_type } = body;
  
        if (!first_name || !last_name || !email_id || !password || !account_type) {
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
        ).bind(email_id.toLowerCase()).first();
  
        if (checkEmail.count > 0) {
          return new Response(
            JSON.stringify({ error: "Email is already in use." }),
            { status: 409, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }
  
        await env.solarportal.prepare(
          "INSERT INTO users (first_name, last_name, email_id, password, account_type, verified) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(first_name, last_name, email_id.toLowerCase(), password, account_type, 0).run();
  
        // API call only for "client" account type
        if (account_type === "client") {
          const apiOptions = {
            method: 'POST',
            headers: {
              Authorization: 'Bearer pk_283c4010e65eeb22c29ae40ae2c12877663f6a97b66dc20d',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              event: "email-verification",
              email: email_id
            })
          };
  
          const apiResponse = await fetch('https://api.useplunk.com/v1/track', apiOptions);
          const apiResult = await apiResponse.json();
  
          if (!apiResult.success) {
            return new Response(
              JSON.stringify({ error: "User registered, but API call failed.", details: apiResult }),
              { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
            );
          }
      } 
  
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
          ).bind(email_id.toLowerCase()).first();
  
          if (!user || user.password !== password) {
            return new Response(
              JSON.stringify({ error: "Invalid login details" }),
              { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
            );
          }
          if (user.verified == 0) {
            return new Response(
              JSON.stringify({ error: "User Not Verified. Check your inbox for a verification email or contact site admins at contactus@alexgs.co.uk"}),
              { status: 405, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }}
            )
          }
  
          if (user.verified == -1) {
            return new Response(
              JSON.stringify({ error: "User Account has been Locked."}),
              { status: 405, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }}
            )
          }
  
          // Return first_name and account_type upon successful login
          return new Response(
            JSON.stringify({ message: "Login successful.", first_name: user.first_name, account_type: user.account_type, user_id:user.user_id }),
            { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
  
        } catch (error) {
          return new Response(
            JSON.stringify({ error: "Login failed.", details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }
      }
  
      if (pathname === "/manage/logins" && request.method === 'GET') {
        try {
          // Fetch all logins from the users table
          const Users = await env.solarportal.prepare(
            "SELECT user_id, first_name, last_name, email_id, account_type, verified FROM users WHERE account_type != 'admin'"
          ).all();
      
          return new Response(
            JSON.stringify({
              users: Users.results,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch logins.", details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }
      }
  
  // Adjusted verification endpoint to use email instead of user_id
  if (pathname === "/manage/verify" && request.method === 'POST') {
    try {
      const body = await request.json();
      const { email } = body;
  
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Missing email." }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
  
      // Update the user's verification status by email
      await env.solarportal.prepare(
        "UPDATE users SET verified = 1 WHERE email_id = ? AND account_type != 'admin'"
      ).bind(email).run();
  
      return new Response(
        JSON.stringify({ message: "User verified successfully." }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
  
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Verification failed.", details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
  }
  
  // Adjusted verification endpoint to use email instead of user_id
  if (pathname === "/manage/verifyme" && request.method === 'POST') {
    try {
      const body = await request.json();
      const { email } = body;
  
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Missing email." }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
  
      // Update the user's verification status by email
      await env.solarportal.prepare(
        "UPDATE users SET verified = 1 WHERE email_id = ? AND verified = 0 AND account_type != 'admin'"
      ).bind(email).run();
  
      return new Response(
        JSON.stringify({ message: "User verified successfully." }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
  
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Verification failed.", details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
  }
  
  // Adjusted verification endpoint to use email instead of user_id
  if (pathname === "/manage/lock" && request.method === 'POST') {
    try {
      const body = await request.json();
      const { email } = body;
  
      if (!email) {
        return new Response(
          JSON.stringify({ error: "Missing email." }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
  
      // Update the user's verification status by email
      await env.solarportal.prepare(
        "UPDATE users SET verified = -1 WHERE email_id = ? AND account_type != 'admin'"
      ).bind(email).run();
  
      return new Response(
        JSON.stringify({ message: "User locked successfully." }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
  
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Account lock failed.", details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
  }
  
    if (pathname === "/manage/removeuser" && request.method === 'POST') {
        try {
          const body = await request.json();
          const { user_id } = body;
  
          if (!user_id) {
            return new Response(
              JSON.stringify({ error: "Missing user_id." }),
              { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
            );
          }
  
  
          await env.solarportal.prepare(
            "DELETE FROM users WHERE user_id = ? AND account_type != 'admin'"
          ).bind(user_id).run();
  
          return new Response(
            JSON.stringify({ message: "User removed successfully." }),
            { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
  
        } catch (error) {
          return new Response(
            JSON.stringify({ error: "Removal failed.", details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }
      }
  
      if (pathname === "/manage/installations" && request.method === 'GET') {
        try {
          // Fetch all applications ordered by status
          const installations = await env.solarportal.prepare(
            `SELECT 
            a.application_id, 
            a.status,
            a.user_id, 
            CONCAT(u.first_name, ' ', u.last_name) AS full_name,
            u.email_id,
            c_panel.component_name AS panel_name,
            c_battery.component_name AS battery_name,
            c_inverter.component_name AS inverter_name,
            a.address, 
            a.postcode, 
            a.property_type, 
            a.roof_type, 
            a.nu_panel, 
            a.price, 
            a.panel_id,
            a.battery_id,
            a.inverter_id,
            a.installation_date
        FROM applications a
        LEFT JOIN users u ON a.user_id = u.user_id
        LEFT JOIN components c_panel ON a.panel_id = c_panel.component_id AND c_panel.component_type = 'panel'
        LEFT JOIN components c_battery ON a.battery_id = c_battery.component_id AND c_battery.component_type = 'battery'
        LEFT JOIN components c_inverter ON a.inverter_id = c_inverter.component_id AND c_inverter.component_type = 'inverter'
        ORDER BY a.status ASC;`
          ).all();
      
          return new Response(
            JSON.stringify(installations.results),
            { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch installations.", details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }
      }
      if (pathname === "/manage/updateapplication" && request.method === 'POST') {
        try {
          const body = await request.json();
          const { application_id, status , installation_date} = body;
      
          if (!application_id || !status) {
            return new Response(
              JSON.stringify({ error: "Application ID and status are required." }),
              { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
            );
          }
      
          // Update the application status
          const updateResult = await env.solarportal.prepare(
            `UPDATE applications
             SET status = ?, installation_date = ?
             WHERE application_id = ?`
          ).bind(status, installation_date, application_id).run();
      
          if (updateResult.changes === 0) {
            return new Response(
              JSON.stringify({ error: "Application not found." }),
              { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
            );
          }
      
          return new Response(
            JSON.stringify({ message: "Application status updated successfully." }),
            { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: "Failed to update application status.", details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }
      }
  
      if (pathname === "/get-components" && request.method === 'GET') {
        try {
          // Fetch all components from the database
          const components = await env.solarportal.prepare(
            `SELECT 
              component_id, 
              component_type, 
              component_name, 
              component_desc, 
              component_price, 
              component_stock 
            FROM components
            ORDER BY component_type ASC, component_price ASC`
          ).all();
      
          return new Response(
            JSON.stringify(components.results),
            { 
              status: 200, 
              headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
              } 
            }
          );
        } catch (error) {
          return new Response(
            JSON.stringify({ error: "Failed to fetch components.", details: error.message }),
            { 
              status: 500, 
              headers: { 
                'Content-Type': 'application/json', 
                'Access-Control-Allow-Origin': '*' 
              } 
            }
          );
        }
      }
      if (pathname === "/submit-application" && request.method === 'POST') {
        try {
            // Parse incoming JSON data
            const body = await request.json();
            const {
                user,
                panel,
                battery,
                inverter,
                address,
                postcode,
                propertyType,
                roofType,
                numPanels,
                totalPrice
            } = body;
    
            // Check for missing values
            if (!user) {
                return new Response(JSON.stringify({ error: "Unable to read user details, please login to browser again. Apologies for the inconvenience." }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }
    
            if (!panel || !battery || !inverter || !address || !postcode || !propertyType || !roofType || !numPanels || !totalPrice) {
                return new Response(JSON.stringify({ error: "Missing required fields. Please fill out all the details and try again." }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }
    
            // Insert the data into the applications table
            await env.solarportal.prepare(
                `INSERT INTO applications 
                (user_id, panel_id, battery_id, inverter_id, address, postcode, property_type, roof_type, nu_panel, price) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
                user, 
                panel, 
                battery, 
                inverter, 
                address, 
                postcode, 
                propertyType, 
                roofType, 
                numPanels, 
                totalPrice
            )
            .run();
    
            // Respond with a success message
            return new Response(JSON.stringify({ message: "Application submitted successfully!" }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
    
        } catch (error) {
            
    
            // Respond with an error message
            return new Response(JSON.stringify({ error: "Failed to submit application. Please try again." }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }
    }
    if (pathname === "/update-component" && request.method === 'POST') {
      try {
          const body = await request.json();
          const { component_id, component_type, component_name, component_desc, component_price, component_stock } = body;
  
          if (!component_id || !component_type || !component_name || !component_desc) {
              return new Response(
                  JSON.stringify({ error: "All fields are required." }),
                  { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
              );
          }
  
          // Update the component details
          const updateResult = await env.solarportal.prepare(
              `UPDATE components
               SET component_type = ?, component_name = ?, component_desc = ?, component_price = ?, component_stock = ?
               WHERE component_id = ?`
          ).bind(component_type.toLowerCase(), component_name, component_desc, component_price, component_stock, component_id).run();
  
          if (updateResult.changes === 0) {
              return new Response(
                  JSON.stringify({ error: "Component not found." }),
                  { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
              );
          }
  
          return new Response(
              JSON.stringify({ message: "Component updated successfully." }),
              { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
      } catch (error) {
          return new Response(
              JSON.stringify({ error: "Failed to update component.", details: error.message }),
              { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
      }
  }
  if (pathname === "/fetch/userDetails" && request.method === 'GET') {
    try {
      // Extract the user_id from query parameters
      const url = new URL(request.url);
      const userId = url.searchParams.get('user_id');
  
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid user_id parameter." }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
      const User = await env.solarportal.prepare(
        "SELECT first_name, last_name, email_id FROM users WHERE user_id = ?"
      ).bind(userId).run();
  
      return new Response(
        JSON.stringify({
          user: User.results[0],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
    catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch user.", details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }}
  
    if (pathname === "/update/userDetails" && request.method === 'POST') {
      try {
        // Extract the user_id from query parameters
        const body = await request.json();
        const { user_id, first_name, last_name, email_id } = body;
    
  
        const User = await env.solarportal.prepare(
          "UPDATE users SET first_name = ?, last_name = ?, email_id = ? WHERE user_id = ?"
        ).bind(first_name, last_name, email_id, user_id).run();
    
        return new Response(
          JSON.stringify({
            user: User.results[0],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
      catch (error) {
        return new Response(
          JSON.stringify({ error: "Failed to update user.", details: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }}
  
  if (pathname === "/manage/installations/user" && request.method === 'GET') {
    try {
      // Extract the user_id from query parameters
      const url = new URL(request.url);
      const userId = url.searchParams.get('user_id');
  
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid user_id parameter." }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
  
      // Fetch applications filtered by user_id
      const installations = await env.solarportal.prepare(
        `SELECT 
        a.application_id, 
        a.status,
        a.user_id, 
        CONCAT(u.first_name, ' ', u.last_name) AS full_name,
        u.email_id,
        c_panel.component_name AS panel_name,
        c_battery.component_name AS battery_name,
        c_inverter.component_name AS inverter_name,
        a.address, 
        a.postcode, 
        a.property_type, 
        a.roof_type, 
        a.nu_panel, 
        a.price, 
        a.panel_id,
        a.battery_id,
        a.inverter_id,
        a.installation_date
    FROM applications a
    LEFT JOIN users u ON a.user_id = u.user_id
    LEFT JOIN components c_panel ON a.panel_id = c_panel.component_id AND c_panel.component_type = 'panel'
    LEFT JOIN components c_battery ON a.battery_id = c_battery.component_id AND c_battery.component_type = 'battery'
    LEFT JOIN components c_inverter ON a.inverter_id = c_inverter.component_id AND c_inverter.component_type = 'inverter'
    WHERE a.user_id = ?
    ORDER BY a.status ASC;`
      ).bind(userId).all();
  
      return new Response(
        JSON.stringify(installations.results),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch installations.", details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
  }
  
  // Handle POST request for user registration
  if (pathname === "/submit-component" && request.method === 'POST') {
    try {
      const body = await request.json();
      const { componentType, componentName, price, stock, description } = body;
  
      if (!componentType || !componentName || !price || !stock || !description) {
        return new Response(
          JSON.stringify({ error: "Missing required fields." }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
  
      await env.solarportal.prepare(
        "INSERT INTO components (component_type, component_name, component_price, component_stock, component_desc) VALUES (?, ?, ?, ?, ?)"
      ).bind(componentType.toLowerCase(), componentName, price, stock, description).run();
  
    return new Response(
      JSON.stringify({ message: "Component registered successfully." }),
      { status: 201, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Registration failed.", details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
  }
  
  if (pathname === "/manage/removeapplication" && request.method === 'POST') {
    try {
      const body = await request.json();
      const { application_id } = body;
  
      if (!application_id) {
        return new Response(
          JSON.stringify({ error: "Missing application." }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
  
      // Update the user's verification status
      await env.solarportal.prepare(
        "DELETE FROM applications WHERE application_id = ?"
      ).bind(application_id).run();
  
      return new Response(
        JSON.stringify({ message: "Application withdraw successfully." }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
  
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Withdraw failed.", details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
  }
  
  if (pathname === "/manage/transactions/user" && request.method === 'POST') {
    try {
      const body = await request.json();
      const { user_id } = body;
  
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "Missing user." }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
  
      // Update the user's verification status
      const result = await env.solarportal.prepare(
        `SELECT 
        a.price, 
        COALESCE(t.amount, 0) AS amount_paid, 
        (a.price - COALESCE(t.amount, 0)) AS outstanding_balance
    FROM applications a
    LEFT JOIN (
        SELECT user_id, SUM(amount) AS amount 
        FROM transactions 
        WHERE user_id = ?
        GROUP BY user_id
    ) t ON a.user_id = t.user_id
    WHERE a.user_id = ?;`
      ).bind(user_id, user_id).run();
  
      return new Response(
        JSON.stringify({ message: "Transactions calculated successfully.", data: result.results }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
  
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Transaction Calculation failed.", details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
  }
  
  if (pathname === "/manage/transactions/all" && request.method === 'GET') {
    try {
        // Fetch all users' outstanding balances
        const balances = await env.solarportal.prepare(`
            SELECT 
                a.user_id,
                SUM(a.price) AS total_due,
                COALESCE(SUM(t.amount), 0) AS total_paid,
                (SUM(a.price) - COALESCE(SUM(t.amount), 0)) AS outstanding_balance
            FROM applications a
            LEFT JOIN transactions t ON a.user_id = t.user_id
            GROUP BY a.user_id;
        `).all();
  // Check if balances has a `.results` property (which can happen with some SQLite drivers)
  const balanceRows = balances.results ? balances.results : balances;
  
  if (!Array.isArray(balanceRows)) {
      throw new Error("Query did not return an array.");
  }
        // Fetch all applications with their prices
        const applications = await env.solarportal.prepare(`
            SELECT 
                user_id, 
                application_id, 
                price
            FROM applications;
        `).all();
  
        const applicationRows = applications.results ? applications.results : applications;
  
        // Fetch all transactions with their amounts
        const transactions = await env.solarportal.prepare(`
            SELECT 
                user_id, 
                transaction_id, 
                amount
            FROM transactions;
        `).all();
  
        const transactionRows = transactions.results ? transactions.results : transactions;
  
  
        // Structure the results into a dictionary keyed by user_id
        const result = {};
  
        balanceRows.forEach(row => {
            result[row.user_id] = {
                user_id: row.user_id,
                total_due: row.total_due / 100, // Convert pence to pounds for display
                total_paid: row.total_paid / 100,
                outstanding_balance: row.outstanding_balance / 100,
                applications: [],
                transactions: []
            };
        });
  
        applicationRows.forEach(row => {
            if (!result[row.user_id]) {
                result[row.user_id] = { applications: [], transactions: [] };
            }
            result[row.user_id].applications.push({
                application_id: row.application_id,
                price: row.price / 100 // Convert pence to pounds for display
            });
        });
  
        transactionRows.forEach(row => {
            if (!result[row.user_id]) {
                result[row.user_id] = { applications: [], transactions: [] };
            }
            result[row.user_id].transactions.push({
                transaction_id: row.transaction_id,
                amount: row.amount / 100, // Convert pence to pounds for display
            });
        });
  
        return new Response(
            JSON.stringify(result),
            { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
  
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Failed to fetch transactions.", details: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
    }
  }
  
  // Handle POST request for user registration
  if (pathname === "/process/payment" && request.method === 'POST') {
    try {
      const body = await request.json();
      const { user_id, amount } = body;
  
      if (!user_id || !amount) {
        return new Response(
          JSON.stringify({ error: "Missing required fields." }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
  
      await env.solarportal.prepare(
        "INSERT INTO transactions (user_id, amount) VALUES (?, ?)"
      ).bind(user_id, amount).run();
  
    return new Response(
      JSON.stringify({ message: "Component registered successfully." }),
      { status: 201, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Registration failed.", details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
  }
  
  if (pathname === "/auth/login/resetpassword" && request.method === 'POST') {
    try {
      const body = await request.json();
      const { user_id, password, new_password } = body;
  
      // Check if all required fields are provided
      if (!user_id || !password || !new_password) {
        return new Response(
          JSON.stringify({ error: "Missing user_id or password." }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
  
      // Fetch user from database
      const user = await env.solarportal.prepare(
        "SELECT * FROM users WHERE user_id = ?"
      ).bind(user_id).first();
  
      // Check if user exists and password is correct
      if (!user || user.password !== password) {
        return new Response(
          JSON.stringify({ error: "Invalid login details" }),
          { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      } else if (password === new_password) {
        return new Response(
          JSON.stringify({ error: "New Password matches old" }),
          { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
  
      // Update password in database and check for errors
      const result = await env.solarportal.prepare(
        "UPDATE users SET password = ? WHERE user_id = ?"
      ).bind(new_password, user_id).run();
  
      if (result) {
        return new Response(
          JSON.stringify({ message: "Password change successful." }),
          { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      } else {
        // If update fails, handle that case
        return new Response(
          JSON.stringify({ error: "Password update failed." }),
          { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
  
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Password reset failed.", details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }
  }
      // Default response
      return new Response(
        JSON.stringify({ message: "Welcome to the SolarPortal API. Please refer to the API documentation for the list of available endpoints and their usage." }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    },
  };