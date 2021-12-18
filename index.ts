import { serve } from "https://deno.land/std@0.114.0/http/server.ts";

const AuthHeader = {
  Authorization: `Bearer ${Deno.env.get("AIRTABLE_API_KEY")}`,
};

// https://stackoverflow.com/a/48161723/782045
async function sha256(message) {
  // encode as UTF-8
  const msgBuffer = new TextEncoder().encode(message);

  // hash the message
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

  // convert ArrayBuffer to Array
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // convert bytes to hex string
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

async function handler(req: Request): Response {
  console.log(req.method, req.url);

  try {
    let url = new URL(req.url);
    let m = url.pathname.match(/\/file(\/.*)$/);
    let key = m && m[1];

    if (key == null) {
      return fetch("https://szhu-speak-typing.glitch.me/");
    } else if (req.method === "GET") {
      let areq = await fetch(
        "https://api.airtable.com/v0/appPhaj6gBQgICTyJ/versions?" +
          new URLSearchParams({
            view: "Newest First",
            maxRecords: "1",
            filterByFormula: `AND(key = ${JSON.stringify(key)})`,
          }),
        {
          headers: {
            ...AuthHeader,
          },
        }
      );
      let json = await areq.json();
      let record = json.records && json.records[0];
      return new Response(
        JSON.stringify(
          record && {
            ...record.fields,
            createdTime: record?.createdTime,
          },
          null,
          2
        ),
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } else if (req.method === "POST") {
      let value = await req.text();
      let areq = await fetch(
        "https://api.airtable.com/v0/appPhaj6gBQgICTyJ/versions",
        {
          method: "POST",
          headers: {
            ...AuthHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            records: [
              {
                fields: {
                  key,
                  value,
                  valueHash: (await sha256(value)).slice(0, 10),
                },
              },
            ],
          }),
        }
      );
      let json = await areq.json();
      let record = json.records && json.records[0];
      return new Response(
        JSON.stringify(
          record && {
            ...record.fields,
            createdTime: record?.createdTime,
          },
          null,
          2
        ),
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

await serve(handler);
