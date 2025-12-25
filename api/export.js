export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { center, zoom, mapType } = req.body;
    const API_KEY = process.env.GOOGLE_MAPS_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "API key missing" });
    }

    const url =
      "https://maps.googleapis.com/maps/api/staticmap" +
      `?center=${center.lat},${center.lng}` +
      `&zoom=${zoom}` +
      `&size=640x640` +
      `&scale=2` +
      `&maptype=${mapType || "satellite"}` +
      `&key=${API_KEY}`;

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    res.setHeader("Content-Type", "image/png");
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export failed" });
  }
}
