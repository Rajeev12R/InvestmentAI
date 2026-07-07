const BASE_URL = "https://gnews.io/api/v4/search";

export async function getCompanyNews(companyName) {

    try {
        const response = await fetch(
            `${BASE_URL}?q=${encodeURIComponent(companyName)}&lang=en&max=10&apikey=${process.env.GNEWS_API_KEY}`
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Unable to fetch news (Status: ${response.status}): ${errorText}`);
        }

        const data = await response.json();

        return data.articles.map(article => ({
            title: article.title,
            description: article.description,
            source: article.source.name,
            publishedAt: article.publishedAt,
            url: article.url,
            image: article.image

        }));

    }

    catch(error){
        console.error(error);
        throw error;

    }

}