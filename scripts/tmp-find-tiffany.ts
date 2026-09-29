import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { usersCollection } = await import("@/dao/users");
  const users = await usersCollection();
  const list = await users
    .find({}, { projection: { email: 1, name: 1, clerkUserId: 1 } })
    .toArray();
  console.log(
    "USERS",
    JSON.stringify(
      list.map((row) => ({ email: row.email, name: row.name, clerkUserId: row.clerkUserId })),
      null,
      2,
    ),
  );

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const query = encodeURIComponent('email:"tiffany.wong@motivgroup-ad.com" OR email:"Tiffany.wong@motivgroup-ad.com"');
  const res = await fetch("https://api.stripe.com/v1/customers/search?query=" + query, {
    headers: { Authorization: "Bearer " + stripeKey },
  });
  const body = await res.json();
  const slim = Array.isArray(body.data)
    ? body.data.map((c: { id: string; email: string | null; name: string | null }) => ({
        id: c.id,
        email: c.email,
        name: c.name,
      }))
    : { status: res.status, type: body?.error?.type, message: body?.error?.message };
  console.log("STRIPE", res.status, JSON.stringify(slim, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
