// Initialize Twitter client
interface RetweetCheckResult {
    hasRetweeted: boolean;
    error?: string;
    tweets?: any[];
}

/**
 * Check if a user has retweeted a specific tweet
 * @param userId Twitter user ID to check (must be numeric)
 * @param tweetId ID of the tweet to check for retweet
 * @returns Promise<RetweetCheckResult>
 */
export async function hasUserRetweeted(
    userId: string,
    tweetId: string
): Promise<RetweetCheckResult> {
    try {
        // Validate that userId is numeric
        if (!/^\d+$/.test(userId)) {
            throw new Error('User ID must be numeric. Please provide a Twitter user ID, not username.');
        }

        const response = await fetch(
            `https://twitter-api71.p.rapidapi.com/UserRepliesAndTweets?user=${userId}`,
            {
                method: 'GET',
                headers: {
                    'x-rapidapi-host': 'twitter-api71.p.rapidapi.com',
                    'x-rapidapi-key': '593912ee04mshb1686f3619244c9p1f49f7jsn5d13481b3c24'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`API response error: ${response.status} - ${await response.text()}`);
        }

        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2));

        // Check user's tweets and replies for the retweet
        const tweets = data.tweets || [];
        const hasRetweeted = tweets.some((tweet: any) => 
            tweet.retweeted_status?.id_str === tweetId || 
            tweet.quoted_status?.id_str === tweetId
        );

        return {
            hasRetweeted,
            tweets,
            error: hasRetweeted ? undefined : 'User has not retweeted this tweet'
        };

    } catch (error) {
        console.error('Error checking retweet:', error);
        return {
            hasRetweeted: false,
            tweets: [],
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

async function getGuestToken(): Promise<string> {
    const response = await fetch('https://api.twitter.com/1.1/guest/activate.json', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA'
        }
    });

    const data = await response.json();
    return data.guest_token;
} 