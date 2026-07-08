const BASE_URL = "https://gnews.io/api/v4/search";

export async function getCompanyNews(companyName) {

    try {
        const response = await fetch(
            `${BASE_URL}?q=${encodeURIComponent(companyName)}&lang=en&max=10&apikey=${process.env.GNEWS_API_KEY}`
        );

        if (!response.ok) {
            console.warn(`Unable to fetch news (Status: ${response.status}) - falling back to empty feed`);
            return [];
        }

        const data = await response.json();

        if (!data || !data.articles) {
            return [];
        }

        return data.articles.map(article => ({
            title: article.title,
            description: article.description,
            source: article.source?.name || "News Feed",
            publishedAt: article.publishedAt,
            url: article.url,
            image: article.image

        }));

    }

    catch(error){
        console.error("News Tool Warning (Graceful Fallback):", error.message);
        return [];

    }

}