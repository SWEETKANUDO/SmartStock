
const API_URL = "http://localhost:5000/api/stock";
const PRODUCT_ID = "6acf31d05eb2f72344ccef1d";

// Terminal mein token set karna, code mein save nahi karna.
const token = process.env.SMARTSTOCK_TOKEN;

async function main() {
  if (!token) {
    console.log("SMARTSTOCK_TOKEN environment variable missing.");
    process.exitCode = 1;
    return;
  }

  const requests = [
    {
      type: "in",
      quantity: 2,
      note: "Concurrent test A",
    },
    {
      type: "in",
      quantity: 3,
      note: "Concurrent test B",
    },
  ];

  const results = await Promise.all(
    requests.map((body) =>
      fetch(`${API_URL}/${PRODUCT_ID}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }).then(async (response) => ({
        status: response.status,
        body: await response.json(),
      }))
    )
  );

  console.log("Concurrent request results:");
  console.log(JSON.stringify(results, null, 2));

  if (results.some((result) => result.status !== 200)) {
    console.log("At least one request failed. Inspect the results.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Test failed:", error.message);
  process.exitCode = 1;
});
