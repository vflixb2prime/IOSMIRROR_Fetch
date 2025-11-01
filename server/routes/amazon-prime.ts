import { RequestHandler } from "express";
import { getTHash } from "./cookie";

interface AmazonPrimeAPIResponse {
  title: string;
  year: number | string;
  lang: Array<{ l: string } | string>;
  episodes?: any[];
  season?: any;
  [key: string]: any;
}

interface AmazonPrimeResponse {
  title: string;
  year: string;
  languages: string;
  category: "Movie" | "Series";
}

export const handleAmazonPrime: RequestHandler = async (req, res) => {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing or invalid ID" });
  }

  try {
    // Get all cookies formatted for the Cookie header
    const cookieHeader = await getTHash();

    const fetchOptions: RequestInit = {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://net51.cc/",
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
    };

    // Use the same scraping approach as Netflix but targeting net20.cc/pv/post.php
    const url = `https://net20.cc/pv/post.php?id=${encodeURIComponent(id)}`;
    const response = await fetch(url, fetchOptions);

    const text = await response.text();

    if (!text) {
      return res.status(500).json({ error: "Empty response from API" });
    }

    let jsonData: any;
    try {
      jsonData = JSON.parse(text);
    } catch (e) {
      console.error("Amazon parse error:", e, "Text:", text.substring(0, 300));
      return res.status(500).json({ error: "Invalid JSON response from API" });
    }

    // Determine if it's a movie or series
    const isSeriesData = Array.isArray(jsonData.season) && jsonData.season.length > 0;
    const category = isSeriesData ? "Series" : "Movie";

    // Extract languages
    const languagesArray = jsonData.lang || [];
    const languages = Array.isArray(languagesArray)
      ? languagesArray.map((lang) => (typeof lang === "string" ? lang : lang.l || lang)).join(", ")
      : "Unknown";

    const result: AmazonPrimeResponse = {
      title: jsonData.title || "Unknown",
      year: (jsonData.year || "Unknown").toString(),
      languages: languages || "Unknown",
      category,
    };

    res.status(200).json(result);
  } catch (error) {
    console.error("Amazon Prime API error:", error);
    res.status(500).json({ error: "Failed to fetch data. Please try again." });
  }
};
